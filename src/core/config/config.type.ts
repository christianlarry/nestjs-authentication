import { AuthConfig } from "src/modules/auth/infrastructure/config/auth-config.type";
import { AppConfig } from "./app/app-config.type";
import { RateLimitConfig } from "./rate-limit/rate-limit-config.type";
import { RedisConfig } from "../infrastructure/persistence/redis/config/redis-config.type";
import { AuthGoogleConfig } from "src/modules/auth-google/infrastructure/config/auth-google-config.type";
import { MailConfig } from "../infrastructure/services/mail/config/mail-config.type";

export type AllConfigType = {
  // Global Configuration
  app: AppConfig;
  auth: AuthConfig;
  authGoogle: AuthGoogleConfig;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  mail: MailConfig;
};