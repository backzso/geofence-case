import * as Joi from 'joi';

/**
 * env.config.ts
 *
 * Validates all required environment variables at startup.
 * The application fails fast if any variable is missing or invalid.
 * Used by ConfigModule.forRoot({ validate }) in AppModule.
 */
export function validate(config: Record<string, unknown>) {
    const schema = Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        PORT: Joi.number().integer().min(1).max(65535).default(3002),
        NODE_ENV: Joi.string()
            .valid('development', 'production', 'test')
            .default('development'),
        KAFKA_BROKERS: Joi.string().required(),
        KAFKA_CLIENT_ID: Joi.string().required(),
        KAFKA_TOPIC_AREA_TRANSITIONS: Joi.string().required(),
        KAFKA_CONSUMER_GROUP_ID: Joi.string().required(),
    }).unknown(true);

    const { error, value } = schema.validate(config, { abortEarly: false });

    if (error) {
        const missing = error.details.map((d) => d.message).join('; ');
        throw new Error(`Configuration validation failed: ${missing}`);
    }

    return value;
}
