import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from './core/config/config.type';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: { level: 'info' } })
  );

  // Retrieve configuration service
  const configService = app.get(ConfigService<AllConfigType>);
  const PORT: number = configService.get<number>('app.port', { infer: true }) || 3000;

  await app.listen(PORT, '0.0.0.0'); // Listen on all interfaces for better container compatibility
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
