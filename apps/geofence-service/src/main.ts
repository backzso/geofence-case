import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './presentation/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe — rejects invalid payloads before reaching controllers.
  // transform:  coerces JSON primitives to DTO types (e.g. number strings → numbers)
  // whitelist:  strips unknown properties not declared in DTOs
  // forbidNonWhitelisted: set to false — we strip silently rather than reject
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global exception filter — must be registered after the pipe so the filter
  // can also handle ValidationPipe's BadRequestException unambiguously.
  app.useGlobalFilters(new HttpExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`Geofence Service listening on port ${port}`);
}

bootstrap();
