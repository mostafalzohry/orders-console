import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Application } from 'express';
import helmet from 'helmet';

export function configureApp(app: INestApplication): void {
  const server = app.getHttpAdapter().getInstance() as Application;
  server.set('trust proxy', 1);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
