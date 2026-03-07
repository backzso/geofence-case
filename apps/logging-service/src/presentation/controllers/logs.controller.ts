import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GetAreaTransitionLogsUseCase } from '../../application/use-cases/get-area-transition-logs.use-case';
import { AreaTransitionLogResponseDto } from '../dto/area-transition-log.response.dto';

/**
 * LogsController — Thin Presentation Layer
 *
 * GET /logs — returns persisted transition logs ordered by occurred_at desc.
 *
 * Delegates to GetAreaTransitionLogsUseCase.
 * No business logic. No direct repository access.
 */
@Controller('logs')
export class LogsController {
    constructor(
        private readonly getLogsUseCase: GetAreaTransitionLogsUseCase,
    ) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    async getLogs(): Promise<AreaTransitionLogResponseDto[]> {
        const logs = await this.getLogsUseCase.execute();
        return logs.map(AreaTransitionLogResponseDto.from);
    }
}
