import { AuthConfig } from "src/modules/auth/infrastructure/config/types/auth-config.type";
import { AppConfig } from "./app/app-config.type";
import { RateLimitConfig } from "./rate-limit/rate-limit-config.type";

export type AllConfigType = {
  // Global Configuration
  app: AppConfig;
  auth: AuthConfig;
  rateLimit: RateLimitConfig;
};