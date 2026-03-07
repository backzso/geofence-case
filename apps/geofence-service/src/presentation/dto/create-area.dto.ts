import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * CreateAreaDto
 *
 * HTTP input for POST /areas. Validated by NestJS ValidationPipe before
 * reaching the controller action. Invalid payloads are rejected with 400
 * before any use case or domain code runs.
 *
 * Validation rules match the specification exactly:
 *   name:      required, non-empty, trimmed, max 120 chars
 *   centerLat: required, finite number, range [-90, 90]
 *   centerLon: required, finite number, range [-180, 180]
 *   radiusM:   required, finite number, range [1, 100_000]
 */
export class CreateAreaDto {
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(120, { message: 'name must not exceed 120 characters' })
  name: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'centerLat must be a number' })
  @Min(-90, { message: 'centerLat must not be less than -90' })
  @Max(90, { message: 'centerLat must not exceed 90' })
  centerLat: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'centerLon must be a number' })
  @Min(-180, { message: 'centerLon must not be less than -180' })
  @Max(180, { message: 'centerLon must not exceed 180' })
  centerLon: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'radiusM must be a number' })
  @Min(1, { message: 'radiusM must be at least 1' })
  @Max(100_000, { message: 'radiusM must not exceed 100000' })
  radiusM: number;
}
