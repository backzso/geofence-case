import { Type } from 'class-transformer';
import {
    IsISO8601,
    IsNumber,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

/**
 * HTTP input DTO for POST /locations.
 */
export class ProcessLocationDto {
    @IsUUID('all', { message: 'userId must be a valid UUID' })
    userId: string;

    @Type(() => Number)
    @IsNumber({}, { message: 'lat must be a number' })
    @Min(-90, { message: 'lat must not be less than -90' })
    @Max(90, { message: 'lat must not exceed 90' })
    lat: number;

    @Type(() => Number)
    @IsNumber({}, { message: 'lon must be a number' })
    @Min(-180, { message: 'lon must not be less than -180' })
    @Max(180, { message: 'lon must not exceed 180' })
    lon: number;

    @IsISO8601({}, { message: 'timestamp must be a valid ISO 8601 date' })
    timestamp: string;
}
