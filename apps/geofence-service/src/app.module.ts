import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './infrastructure/config/env.config';
import { GeofenceModule } from './geofence.module';

/**
 * AppModule — Root Module
 *
 * Bootstraps configuration validation before any other module initializes.
 * If DATABASE_URL, PORT, or NODE_ENV are missing or invalid, the app exits
 * immediately with a descriptive error (fail-fast startup).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      envFilePath: '.env',
    }),
    GeofenceModule,
  ],
})
export class AppModule {}
