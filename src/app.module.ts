import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import appConfig from './core/config/app/app.config';
import mailConfig from './core/infrastructure/services/mail/config/mail.config';
import authConfig from './modules/auth/infrastructure/config/auth.config';
import redisConfig from './core/infrastructure/persistence/redis/config/redis.config';
import { REDIS_CLIENT, RedisModule } from './core/infrastructure/persistence/redis/redis.module';
import { MailerModule } from './core/infrastructure/mailer/mailer.module';
import { MailModule } from './core/infrastructure/services/mail/mail.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { AllConfigType } from './core/config/config.type';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGoogleModule } from './modules/auth-google/auth-google.module';
import authGoogleConfig from './modules/auth-google/infrastructure/config/auth-google.config';
import rateLimitConfig from './core/config/rate-limit/rate-limit.config';
import prismaConfig from './core/infrastructure/persistence/prisma/config/prisma.config';
import { PrismaModule } from './core/infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [
        appConfig,
        mailConfig,
        authConfig,
        authGoogleConfig,
        redisConfig,
        rateLimitConfig,
        prismaConfig
      ]
    }),
    RedisModule,
    BullModule.forRootAsync({
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
        prefix: 'bull', // Optional: set a prefix for all queues
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (
        configService: ConfigService<AllConfigType>,
        redis: Redis
      ) => ({
        throttlers: [{
          ttl: configService.get('rateLimit.ttl', { infer: true }) || 60000,
          limit: configService.get('rateLimit.limit', { infer: true }) || 10,
        }],
        storage: new ThrottlerStorageRedisService(redis),
        skipIf: () => {
          return configService.get('app.nodeEnv', { infer: true })! === 'development';
        },
      }),
    }),
    MailerModule,
    MailModule,
    JwtModule.register({
      global: true,
    }),
    PrismaModule,

    // Feature Module
    AuthModule,
    AuthGoogleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }
  ],
})
export class AppModule { }