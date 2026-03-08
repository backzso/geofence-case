import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GetAreaTransitionLogsUseCase } from '../../application/use-cases/get-area-transition-logs.use-case';
import { AreaTransitionLogResponseDto } from '../dto/area-transition-log.response.dto';

/**
 * REST controller for audit logs.
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
