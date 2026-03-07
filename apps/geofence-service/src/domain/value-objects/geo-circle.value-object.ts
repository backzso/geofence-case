import { DomainValidationError } from '../errors/domain-validation.error';

/**
 * GeoCircle — Value Object
 *
 * Represents the circle definition provided at area creation time.
 * This is a WRITE-PATH INPUT ONLY. It is never reconstructed from the database.
 *
 * The infrastructure layer uses GeoCircle's coordinates to emit the PostGIS
 * ST_Buffer(...) expression. After persistence, this value object is discarded —
 * the read path returns AreaSummary directly from scalar DB columns.
 *
 * Enforces:
 *   - centerLat: finite number in [-90, 90]
 *   - centerLon: finite number in [-180, 180]
 *   - radiusM:   finite number in [1, 100_000]
 *
 * No dependency on NestJS, Prisma, or any infrastructure concern.
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
