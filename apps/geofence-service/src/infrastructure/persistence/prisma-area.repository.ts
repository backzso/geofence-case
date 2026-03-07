import { Injectable } from '@nestjs/common';
import { Area } from '../../domain/entities/area.entity';
import { AreaSummary, IAreaRepository } from '../../application/ports/area.repository.port';
import { PrismaService } from './prisma.service';
import { Prisma } from './generated';

/**
 * PrismaAreaRepository — Infrastructure Implementation
 *
 * Implements IAreaRepository using Prisma + raw SQL for PostGIS geometry operations.
 *
 * Architectural rules enforced here:
 *   - All geometry SQL is isolated in this file only. No raw SQL anywhere else.
 *   - Prisma client accessors are NOT used for the geom column (Unsupported type).
 *   - save() uses INSERT ... RETURNING via a single raw SQL statement inside a
 *     prisma.$transaction, making the geometry computation and persistence atomic.
 *   - findAllSummaries() uses prisma.area.findMany() for scalar fields only —
 *     no geometry deserialization, no PostGIS WKB parsing.
 */
@Injectable()
export class PrismaAreaRepository implements IAreaRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a new Area and returns the DB-generated AreaSummary.
   *
   * The polygon is computed entirely by PostGIS:
   *   ST_Buffer(
   *     ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
   *     radius_m
   *   )::geometry
   *
   * The INSERT ... RETURNING clause surfaces id and created_at in a single
   * atomic statement — no second SELECT needed.
   *
   * The name is provided from the AreaName value object (already trimmed and validated).
   */
  async save(area: Area): Promise<AreaSummary> {
    const { centerLon, centerLat, radiusM } = area.circle;
    const nameValue = area.name.value;

    // Raw SQL is required because Prisma cannot write to the
    // Unsupported("geometry(Polygon,4326)") column through its typed client.
    // The transaction ensures atomicity: geometry computation + INSERT are one operation.
    const rows = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Prisma.sql automatically parameterizes the inputs, protecting against injection
      return tx.$queryRaw<Array<{ id: string; name: string; created_at: Date }>>(
        Prisma.sql`
        INSERT INTO geofence.areas (name, geom)
        VALUES (
          ${nameValue},
          public.ST_Buffer(
            public.ST_SetSRID(public.ST_MakePoint(${centerLon}, ${centerLat}), 4326)::public.geography,
            ${radiusM}
          )::public.geometry
        )
        RETURNING id, name, created_at
        `
      );
    });

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    };
  }

  /**
   * Returns lightweight AreaSummary projections for all persisted areas.
   *
   * Uses prisma.area.findMany() for scalar fields only. The geom column is
   * excluded — it is Unsupported and not needed for listing purposes.
   * No geometry deserialization (PostGIS WKB) occurs here.
   */
  async findAllSummaries(): Promise<AreaSummary[]> {
    const rows = await this.prisma.area.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true, // Uses camelCase due to Prisma schema @map
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
    }));
  }
}
