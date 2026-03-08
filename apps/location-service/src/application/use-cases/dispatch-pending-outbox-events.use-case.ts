import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    OUTBOX_EVENT_REPOSITORY,
    IOutboxEventRepository,
} from '../ports/outbox-event.repository.port';
import {
    OUTBOX_PUBLISHER,
    IOutboxPublisher,
} from '../ports/outbox.publisher.port';

/**
 * DispatchPendingOutboxEventsUseCase
 *
 * Application-layer orchestration for a single outbox polling cycle.
 *
 * Per-cycle flow:
 *   1. Claim up to OUTBOX_BATCH_SIZE pending rows atomically
 *      (each claimed row transitions: pending → processing in DB)
 *   2. For each claimed row, independently:
 *      a. Publish to Kafka via IOutboxPublisher
 *      b. On success:  markPublished(row.id)
 *      c. On failure:  resetToRetryable(row.id) — resets to pending, increments attempts
 *
 * Each row is finalized independently.
 * A Kafka failure for one row does not block or rollback other rows in the batch.
 *
 * No Prisma. No Kafka. No NestJS modules imported.
 * Pure orchestration against application ports.
 */
@Injectable()
export class DispatchPendingOutboxEventsUseCase {
    private readonly logger = new Logger(DispatchPendingOutboxEventsUseCase.name);
    private readonly batchSize: number;

    constructor(
        @Inject(OUTBOX_EVENT_REPOSITORY)
        private readonly outboxRepo: IOutboxEventRepository,
        @Inject(OUTBOX_PUBLISHER)
        private readonly outboxPublisher: IOutboxPublisher,
        private readonly configService: ConfigService,
    ) {
        this.batchSize = this.configService.get<number>('OUTBOX_BATCH_SIZE', 50);
    }

    async execute(): Promise<void> {
        const claimed = await this.outboxRepo.claimPendingBatch(this.batchSize);

        if (claimed.length === 0) {
            return;
        }

        this.logger.debug(`Claimed ${claimed.length} outbox event(s) for dispatch`);

        for (const event of claimed) {
            try {
                await this.outboxPublisher.publish(event);
                await this.outboxRepo.markPublished(event.id);
                this.logger.log(
                    `Outbox event published. id=${event.id} eventId=${event.eventId} type=${event.eventType}`,
                );
            } catch (err) {
                await this.outboxRepo.resetToRetryable(event.id);
                this.logger.error(
                    `Failed to publish outbox event. id=${event.id} eventId=${event.eventId} attempts=${event.attempts + 1}`,
                    err instanceof Error ? err.stack : String(err),
                );
            }
        }
    }
}
