import { plainToInstance } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsString,
    Max,
    Min,
    validateSync,
} from 'class-validator';

enum NodeEnv {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

/**
 * EnvironmentVariables
 *
 * Declares and validates all environment variables required at startup.
 * The app will fail fast with a descriptive error if any variable is
 * missing or invalid — before any module initializes.
 */
class EnvironmentVariables {
    @IsString()
    @IsNotEmpty()
    DATABASE_URL: string;

    @IsInt()
    @Min(1)
    @Max(65535)
    PORT: number;

    @IsEnum(NodeEnv)
    NODE_ENV: NodeEnv;

    @IsString()
    @IsNotEmpty()
    KAFKA_BROKERS: string;

    @IsString()
    @IsNotEmpty()
    KAFKA_CLIENT_ID: string;

    @IsString()
    @IsNotEmpty()
    KAFKA_TOPIC_AREA_TRANSITIONS: string;
}

/**
 * validateConfig
 *
 * Used as the validate function in ConfigModule.forRoot().
 * Throws on first validation failure — does not silently continue.
 */
export function validateConfig(config: Record<string, unknown>): EnvironmentVariables {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const messages = errors
            .map((e) => Object.values(e.constraints ?? {}).join(', '))
            .join('; ');
        throw new Error(`Configuration validation failed: ${messages}`);
    }

    return validatedConfig;
}
