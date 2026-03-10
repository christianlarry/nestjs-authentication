import { Global, Module, OnModuleDestroy, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { AllConfigType } from "src/config/config.type";

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const logger = new Logger('RedisModule');

        const redis = new Redis({
          host: configService.get('redis.host', { infer: true }) || 'localhost',
          port: configService.get('redis.port', { infer: true }) || 6379,
          password: configService.get('redis.password', { infer: true }),
          db: configService.get('redis.db', { infer: true }) || 0,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000); // Exponential backoff up to 2 seconds
            logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
            return delay;
          },
          // Prevents the client from giving up on a request after a certain number of retries. BullMQ highly recommends setting this to null.
          maxRetriesPerRequest: null,
        });

        redis.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        redis.on('ready', () => {
          logger.log('Redis is ready to accept commands');
        });

        redis.on('error', (error) => {
          logger.error(`Redis connection error: ${error.message}`);
        });

        redis.on('close', () => {
          logger.warn('Redis connection closed');
        });

        redis.on('reconnecting', () => {
          logger.log('Redis reconnecting...');
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT], // ✅ Export agar bisa digunakan di module lain
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection...');
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}