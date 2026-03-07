import { Injectable } from '@nestjs/common';
import { IGeofenceReadRepository } from '../../application/ports/geofence-read.repository.port';
import { PrismaService } from './prisma.service';

/**
 * PrismaGeofenceReadRepository
 *
 * Read-only access to geofence.areas for spatial containment queries.
 * The Location Service reads from the geofence schema but never writes to it.
 *
 * Uses PostGIS ST_Covers for boundary-inclusive polygon containment.
 * PostGIS functions are schema-qualified with public. because the
 * DATABASE_URL sets the default search_path to the location schema.
 *
 * This query runs OUTSIDE the advisory-locked transaction.
 * This is an intentional performance tradeoff:
 *   - Geofence mutations are rare administrative operations
 *   - Holding the advisory lock during spatial scans would degrade throughput
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
