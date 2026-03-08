import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    // Graceful shutdown hooks for Kafka/DB
    app.enableShutdownHooks();

    const port = process.env.PORT ?? 3002;
    await app.listen(port);

    console.log(`Logging Service listening on port ${port}`);
}

bootstrap();
