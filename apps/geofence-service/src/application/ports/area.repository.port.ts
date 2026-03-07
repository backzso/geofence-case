import { Area } from '../../domain/entities/area.entity';

/**
 * AreaSummary — Read Model
 *
 * The projection returned by both the write path (save) and the read path (findAllSummaries).
 * Contains only DB-scalar fields — no geometry, no GeoCircle.
 *
 * Defined here in the application/ports layer because it is a port contract,
 * not a domain concept. Both the repository interface and use case outputs use this type.
 */
export interface AreaSummary {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * IAreaRepository — Repository Port
 *
 * Defined in the application layer. The domain and use cases depend on this
 * interface, never on the Prisma implementation.
 *
 * save():
 *   Persists a new Area and returns an AreaSummary populated with DB-generated
 *   fields (id, createdAt) via INSERT ... RETURNING. Atomic — the polygon geometry
 *   computation (ST_Buffer) and the INSERT are in a single transaction.
 *
 * findAllSummaries():
 *   Returns lightweight AreaSummary projections from scalar columns only.
 *   No geometry deserialization. No Area entity hydration.
 */
export interface IAreaRepository {
  save(area: Area): Promise<AreaSummary>;
  findAllSummaries(): Promise<AreaSummary[]>;
}

/**
 * Injection token for IAreaRepository.
 * Used in NestJS DI to bind the interface to its Prisma implementation.
 */
export const AREA_REPOSITORY = Symbol('IAreaRepository');
