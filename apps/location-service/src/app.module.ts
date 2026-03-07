import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationModule } from './location.module';
import { validateConfig } from './infrastructure/config/env.config';

/**
 * AppModule — Root Module
 *
 * Configures global NestJS settings:
 *   - ConfigModule.forRoot with fail-fast env validation
 *   - LocationModule for all location processing features
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateConfig,
        }),
        LocationModule,
    ],
})
export class AppModule { }
