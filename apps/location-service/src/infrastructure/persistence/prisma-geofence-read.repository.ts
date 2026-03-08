import { Injectable } from '@nestjs/common';
import { IGeofenceReadRepository } from '../../application/ports/geofence-read.repository.port';
import { PrismaService } from './prisma.service';

/**
 * Read-only PostGIS boundary containment checks using ST_Covers.
 * intentionally executed strictly outside the transactional lock to maximize throughput.
 */
@Injectable()
export class PrismaGeofenceReadRepository implements IGeofenceReadRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findContainingAreaIds(lon: number, lat: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM geofence.areas
      WHERE public.ST_Covers(
        geom,
        public.ST_SetSRID(public.ST_MakePoint(${lon}, ${lat}), 4326)
      )
    `;

    return rows.map((row) => row.id);
  }
}
