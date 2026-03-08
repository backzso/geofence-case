import { AreaId } from '../value-objects/area-id.value-object';
import { AreaName } from '../value-objects/area-name.value-object';
import { GeoCircle } from '../value-objects/geo-circle.value-object';

/**
 * Aggregate root for a geofence area.
 * Uses strict lifecycle factory methods (e.g., forCreation) to enforce invariants 
 * before DB insertion.
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


  static forCreation(name: AreaName, circle: GeoCircle): Area {
    return new Area(null, name, circle, null);
  }


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
