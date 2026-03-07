/**
 * Opaque transaction context.
 *
 * The use case passes this to repository port methods without
 * inspecting, casting, or depending on its concrete type.
 * Infrastructure determines the actual runtime type (e.g. Prisma tx client).
 */
export type TransactionContext = unknown;

/**
 * ILocationTransactionManager — Application Port
 *
 * Abstracts the transactional + locking boundary.
 * The application layer calls executeInTransaction without knowing
 * about Prisma, advisory locks, or isolation levels.
 *
 * The infrastructure implementation:
 *   1. Opens a database transaction
 *   2. Acquires a user-scoped advisory lock (pg_advisory_xact_lock)
 *   3. Executes the callback
 *   4. Commits on success / rolls back on error
 *   5. Releases the lock automatically on commit/rollback
 */
export interface ILocationTransactionManager {
    executeInTransaction<T>(
        userId: string,
        callback: (tx: TransactionContext) => Promise<T>,
    ): Promise<T>;
}

export const LOCATION_TRANSACTION_MANAGER = Symbol('ILocationTransactionManager');
