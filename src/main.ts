import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from './core/config/config.type';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Retrieve configuration service
  const configService = app.get(ConfigService<AllConfigType>);
  const PORT: number = configService.get<number>('app.port', { infer: true }) || 3000;

  await app.listen(PORT);
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
