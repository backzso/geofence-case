import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './infrastructure/config/env.config';
import { LoggingModule } from './logging.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate,
        }),
        LoggingModule,
    ],
})
export class AppModule { }
