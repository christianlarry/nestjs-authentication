import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from './core/config/config.type';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';

async function bootstrap() {
  // Configure Fastify adapter with enhanced logging
  const adapter = new FastifyAdapter({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // Create NestJS application with Fastify adapter 
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // Retrieve configuration service
  const config = app.get(ConfigService<AllConfigType>);

  // Set up global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: process.env.NODE_ENV === 'production', // Keamanan di production, tampilkan pesan error hanya saat development
  }));

  app.enableCors({
    origin: '*', // Allow all origins (you can specify specific origins if needed)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  })
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // --- Register Fastify plugins ---
  // Use a secure secret for cookie signing in production (consider using environment variables or a secrets manager)
  await app.register(fastifyCookie, {
    secret: config.get<string>('app.cookieSecret', { infer: true }) || 'kfsajlkfsjauwhitjdfsa42421kmnls'
  })
  // Enable compression and security headers
  await app.register(fastifyCompress, { global: true })
  // Enable Helmet with default options (you can customize as needed)
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // TODO: Enable in production with proper directives
  })

  // Set up Swagger documentation
  const documentOptions = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, documentOptions);
  SwaggerModule.setup('docs', app, document);

  // App Listen
  const PORT: number = config.get<number>('app.port', { infer: true }) || 3000;
  await app.listen(PORT, '0.0.0.0'); // Listen on all interfaces for better container compatibility
}

bootstrap().catch((error) => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
