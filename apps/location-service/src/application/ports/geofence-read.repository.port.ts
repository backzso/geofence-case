/**
 * IGeofenceReadRepository — Application Port
 *
 * Read-only access to geofence areas for containment checks.
 * The Location Service reads geofence.areas but never writes to it.
 *
 * Returns only area IDs — does not hydrate full geofence entities.
 */
export interface IGeofenceReadRepository {
    /**
     * Finds all area IDs whose polygon contains the given point.
     * Uses PostGIS ST_Covers for boundary-inclusive containment.
     *
     * @param lon Longitude (first argument to ST_MakePoint)
     * @param lat Latitude (second argument to ST_MakePoint)
     * @returns Array of area UUID strings
     */
    findContainingAreaIds(lon: number, lat: number): Promise<string[]>;
}

export const GEOFENCE_READ_REPOSITORY = Symbol('IGeofenceReadRepository');
