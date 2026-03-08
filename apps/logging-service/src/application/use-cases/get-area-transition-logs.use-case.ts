import { Inject, Injectable } from '@nestjs/common';
import {
    AREA_TRANSITION_LOG_REPOSITORY,
    AreaTransitionLogReadModel,
    IAreaTransitionLogRepository,
} from '../ports/area-transition-log.repository.port';

/**
 * Read path for area transition logs.
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
