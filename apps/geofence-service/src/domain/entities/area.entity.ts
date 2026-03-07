import { AreaId } from '../value-objects/area-id.value-object';
import { AreaName } from '../value-objects/area-name.value-object';
import { GeoCircle } from '../value-objects/geo-circle.value-object';

/**
 * Area — Domain Entity
 *
 * The aggregate root for a geofence area.
 *
 * Two factory methods serve distinct lifecycle contexts:
 *
 *   Area.forCreation(name, circle)
 *     Write path only. Used in CreateAreaUseCase before persistence.
 *     id and createdAt are NOT set here — they are DB-generated and returned
 *     by the repository via INSERT ... RETURNING. The repository only reads
 *     name and circle from this entity; id and createdAt come from the DB.
 *
 *   Area.reconstitute(id, name, circle, createdAt)   [future use]
 *     Rebuilds an Area from DB-sourced data. Reserved for future read paths
 *     that need the full entity (e.g., if circle parameters are stored).
 *
 * GeoCircle is a WRITE-PATH INPUT ONLY — it is never reconstructed from the DB.
 * After persistence, the infrastructure discards the GeoCircle reference.
 * The read path returns AreaSummary directly from scalar DB columns.
 *
 * No dependency on NestJS, Prisma, HTTP concepts, or any infrastructure concern.
 */
export class Area {
  private readonly _id: AreaId | null;
  private readonly _name: AreaName;
  private readonly _circle: GeoCircle;
  private readonly _createdAt: Date | null;

  private constructor(
    id: AreaId | null,
    name: AreaName,
    circle: GeoCircle,
    createdAt: Date | null,
  ) {
    this._id = id;
    this._name = name;
    this._circle = circle;
    this._createdAt = createdAt;
  }

  /**
   * Write-path factory: constructs an Area for creation.
   * id and createdAt are not known yet — they are assigned by the DB.
   * The repository accesses only name and circle.
   */
  static forCreation(name: AreaName, circle: GeoCircle): Area {
    return new Area(null, name, circle, null);
  }

  /**
   * Reconstitution factory: rebuilds an Area from DB-sourced data.
   * Reserved for future read paths that hydrate the full entity.
   */
  static reconstitute(id: AreaId, name: AreaName, circle: GeoCircle, createdAt: Date): Area {
    return new Area(id, name, circle, createdAt);
  }

  get id(): AreaId | null {
    return this._id;
  }

  get name(): AreaName {
    return this._name;
  }

  get circle(): GeoCircle {
    return this._circle;
  }

  get createdAt(): Date | null {
    return this._createdAt;
  }
}
