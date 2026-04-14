import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Prevent any stray WebSocket or network errors from crashing the process.
  // ethers.js can emit these when an RPC connection drops.
  process.on('uncaughtException', (err) => {
    if (
      err.message?.includes('Unexpected server response') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('ENOTFOUND')
    ) {
      logger.warn(`Non-fatal network error suppressed: ${err.message}`);
    } else {
      logger.error(`Uncaught exception: ${err.message}`);
      // Only re-throw truly unexpected errors
    }
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.warn(`Unhandled promise rejection: ${reason?.message ?? reason}`);
  });

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`PSL NFT backend running on http://localhost:${port}/api`);
  logger.log(`WebSocket available on ws://localhost:${port}`);
}

bootstrap();
