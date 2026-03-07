import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe — rejects invalid payloads before reaching controllers.
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
        }),
    );

    // Global exception filter — standardized error responses.
    app.useGlobalFilters(new HttpExceptionFilter());

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT') ?? 3001;

    await app.listen(port);
    console.log(`Location Service listening on port ${port}`);
}

bootstrap();
