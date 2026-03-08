import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * Write-path only representation of a circular geofence boundary.
 * Translated by infrastructure into a PostGIS polygon.
 */
export class GeoCircle {
  private readonly _centerLat: number;
  private readonly _centerLon: number;
  private readonly _radiusM: number;

  private constructor(centerLat: number, centerLon: number, radiusM: number) {
    this._centerLat = centerLat;
    this._centerLon = centerLon;
    this._radiusM = radiusM;
  }

  static create(centerLat: number, centerLon: number, radiusM: number): GeoCircle {
    if (!Number.isFinite(centerLat) || centerLat < -90 || centerLat > 90) {
      throw new DomainValidationError(
        `centerLat must be a finite number between -90 and 90, got: ${centerLat}`,
      );
    }

    if (!Number.isFinite(centerLon) || centerLon < -180 || centerLon > 180) {
      throw new DomainValidationError(
        `centerLon must be a finite number between -180 and 180, got: ${centerLon}`,
      );
    }

    if (!Number.isFinite(radiusM) || radiusM < 1 || radiusM > 100_000) {
      throw new DomainValidationError(
        `radiusM must be a finite number between 1 and 100000, got: ${radiusM}`,
      );
    }

    return new GeoCircle(centerLat, centerLon, radiusM);
  }

  get centerLat(): number {
    return this._centerLat;
  }

  get centerLon(): number {
    return this._centerLon;
  }

  get radiusM(): number {
    return this._radiusM;
  }
}
