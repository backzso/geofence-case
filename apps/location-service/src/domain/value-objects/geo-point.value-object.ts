import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * GeoPoint — Value Object
 *
 * Represents a geographic coordinate pair (latitude, longitude).
 *
 * Enforces:
 *   - lat: finite number in [-90, 90]
 *   - lon: finite number in [-180, 180]
 *
 * No dependency on NestJS, Prisma, or any infrastructure concern.
 */
export class GeoPoint {
    private readonly _lat: number;
    private readonly _lon: number;

    private constructor(lat: number, lon: number) {
        this._lat = lat;
        this._lon = lon;
    }

    static create(lat: number, lon: number): GeoPoint {
        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            throw new DomainValidationError(
                `lat must be a finite number between -90 and 90, got: ${lat}`,
            );
        }

        if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
            throw new DomainValidationError(
                `lon must be a finite number between -180 and 180, got: ${lon}`,
            );
        }

        return new GeoPoint(lat, lon);
    }

    get lat(): number {
        return this._lat;
    }

    get lon(): number {
        return this._lon;
    }
}
