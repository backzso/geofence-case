import { Inject, Injectable } from '@nestjs/common';
import {
    AREA_TRANSITION_LOG_REPOSITORY,
    AreaTransitionLogReadModel,
    IAreaTransitionLogRepository,
} from '../ports/area-transition-log.repository.port';

/**
 * GetAreaTransitionLogsUseCase
 *
 * Read-side use case for GET /logs.
 * Retrieves all stored transition logs ordered by occurred_at descending.
 *
 * Returns flat AreaTransitionLogReadModel[] — no domain VOs on read path.
 * Controller maps these to response DTOs.
 *
 * No business logic. No state mutation. No Kafka. No raw SQL.
 */
@Injectable()
export class GetAreaTransitionLogsUseCase {
    constructor(
        @Inject(AREA_TRANSITION_LOG_REPOSITORY)
        private readonly repository: IAreaTransitionLogRepository,
    ) { }

    async execute(): Promise<AreaTransitionLogReadModel[]> {
        return this.repository.findAll();
    }
}
