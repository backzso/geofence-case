import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DispatchPendingOutboxEventsUseCase } from '../../application/use-cases/dispatch-pending-outbox-events.use-case';

/**
 * OutboxPollerService
 *
 * Lifecycle-managed infrastructure component that drives the outbox dispatch loop.
 *
 * Lifecycle:
 *   OnModuleInit     — starts the polling interval
 *   OnModuleDestroy  — clears the interval for graceful shutdown
 *
 * Re-entrancy guard: `isRunning` flag prevents a new cycle from starting if
 * the previous cycle is still in progress. This is supplementary to the
 * DB-level `processing` status — the primary multi-instance safety mechanism.
 *
 * Poll interval and batch size are driven by OUTBOX_POLL_INTERVAL_MS
 * and OUTBOX_BATCH_SIZE env vars (validated at startup).
 *
 * The poller does not run inside controllers; it is a NestJS lifecycle service
 * managed entirely in the application bootstrap.
 */
@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OutboxPollerService.name);
    private readonly pollIntervalMs: number;
    private intervalHandle: ReturnType<typeof setInterval> | null = null;
    private isRunning = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly dispatchUseCase: DispatchPendingOutboxEventsUseCase,
    ) {
        this.pollIntervalMs = this.configService.get<number>(
            'OUTBOX_POLL_INTERVAL_MS',
            3000,
        );
    }

    onModuleInit(): void {
        this.intervalHandle = setInterval(
            () => void this.runCycle(),
            this.pollIntervalMs,
        );
        this.logger.log(
            `Outbox poller started. interval=${this.pollIntervalMs}ms`,
        );
    }

    onModuleDestroy(): void {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
        this.logger.log('Outbox poller stopped');
    }

    /**
     * Executes a single polling cycle.
     * If the previous cycle is still running, skips this tick (re-entrancy guard).
     * Errors are caught and logged — a failed cycle does not stop the poller.
     */
    private async runCycle(): Promise<void> {
        if (this.isRunning) {
            this.logger.debug('Outbox poller cycle skipped — previous cycle still running');
            return;
        }

        this.isRunning = true;
        try {
            await this.dispatchUseCase.execute();
        } catch (err) {
            this.logger.error(
                'Outbox polling cycle failed unexpectedly',
                err instanceof Error ? err.stack : String(err),
            );
        } finally {
            this.isRunning = false;
        }
    }
}
