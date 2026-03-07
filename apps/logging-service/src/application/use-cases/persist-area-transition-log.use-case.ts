import { Inject, Injectable } from '@nestjs/common';
import { AreaTransitionLog } from '../../domain/entities/area-transition-log.entity';
import { PersistAreaTransitionLogCommand } from '../commands/persist-area-transition-log.command';
import {
    AREA_TRANSITION_LOG_REPOSITORY,
    IAreaTransitionLogRepository,
} from '../ports/area-transition-log.repository.port';

/**
 * PersistAreaTransitionLogUseCase
 *
 * Orchestrates the write path for a single transition event:
 *
 *   1. Build domain entity (validates all invariants via VOs)
 *   2. Delegate persistence to the repository port
 *   3. Return 'persisted' | 'duplicate' to the consumer
 *
 * DomainValidationError propagates to the caller (Kafka consumer),
 * which treats it as an intentional payload skip.
 *
 * No Prisma. No Kafka. No raw SQL.
 */
@Injectable()
export class PersistAreaTransitionLogUseCase {
    constructor(
        @Inject(AREA_TRANSITION_LOG_REPOSITORY)
        private readonly repository: IAreaTransitionLogRepository,
    ) { }

    async execute(
        command: PersistAreaTransitionLogCommand,
    ): Promise<'persisted' | 'duplicate'> {
        const log = AreaTransitionLog.create({
            eventId: command.eventId,
            userId: command.userId,
            areaId: command.areaId,
            eventType: command.eventType,
            occurredAt: command.occurredAt,
        });

        return this.repository.save(log);
    }
}
