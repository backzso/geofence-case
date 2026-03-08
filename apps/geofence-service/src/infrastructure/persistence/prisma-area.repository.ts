import { Injectable } from '@nestjs/common';
import { Area } from '../../domain/entities/area.entity';
import { AreaSummary, IAreaRepository } from '../../application/ports/area.repository.port';
import { PrismaService } from './prisma.service';
import { Prisma } from './generated';

/**
 * Implements IAreaRepository with raw SQL for PostGIS geometry operations.
 * Prisma client does not support geometry types.
 */
@Injectable()
export class PrismaAreaRepository implements IAreaRepository {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Translates point + radius into PostGIS geometry (ST_Buffer). 
   */
  async save(area: Area): Promise<AreaSummary> {
    const { centerLon, centerLat, radiusM } = area.circle;
    const nameValue = area.name.value;

    // Raw query for PostGIS insertion
    const rows = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
   * Returns metadata for all areas, omitting raw geometry bytes.
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
