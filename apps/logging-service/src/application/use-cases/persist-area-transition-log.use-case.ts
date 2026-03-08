import { Inject, Injectable } from '@nestjs/common';
import { AreaTransitionLog } from '../../domain/entities/area-transition-log.entity';
import { PersistAreaTransitionLogCommand } from '../commands/persist-area-transition-log.command';
import {
    AREA_TRANSITION_LOG_REPOSITORY,
    IAreaTransitionLogRepository,
} from '../ports/area-transition-log.repository.port';

/**
 * Write path for area transitions.
 * Returns 'duplicate' if the eventId was already processed.
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
