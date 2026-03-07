import { AreaTransitionLog } from '../../domain/entities/area-transition-log.entity';

/**
 * AreaTransitionLogReadModel
 *
 * A flat, serializable read model returned by the repository for query operations.
 * Does not use domain Value Objects — maps directly to DB row fields.
 * Used by GetAreaTransitionLogsUseCase and mapped to response DTOs in the controller.
 */
export interface AreaTransitionLogReadModel {
    id: string;
    eventId: string;
    userId: string;
    areaId: string;
    eventType: string;
    occurredAt: Date;
    receivedAt: Date;
}

/**
 * IAreaTransitionLogRepository — Application Port
 *
 * Write side: save() accepts a domain entity and returns 'persisted' | 'duplicate'.
 * Read side: findAll() returns a flat read model list for query operations.
 *
 * Infrastructure isolates all SQL and Prisma details behind this port.
 */
export interface IAreaTransitionLogRepository {
    /**
     * Persists a new log entry.
     * Uses INSERT ... ON CONFLICT (event_id) DO NOTHING.
     *
     * Returns:
     *   'persisted' — new row written
     *   'duplicate' — event_id already exists, safe no-op
     *
     * Any other DB error is re-thrown to the caller (use case → consumer).
     */
    save(log: AreaTransitionLog): Promise<'persisted' | 'duplicate'>;

    /**
     * Returns all transition logs ordered by occurred_at descending.
     */
    findAll(): Promise<AreaTransitionLogReadModel[]>;
}

export const AREA_TRANSITION_LOG_REPOSITORY = Symbol(
    'IAreaTransitionLogRepository',
);
