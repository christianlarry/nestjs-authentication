import { registerAs } from "@nestjs/config";
import { IsInt, Max, Min } from "class-validator";
import { RateLimitConfig } from "./rate-limit-config.type";
import validateConfig from "src/utils/validate-config";

class EnvirontmentVariablesValidator {
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT: number;

  @IsInt()
  @Min(1)
  RATE_LIMIT_TTL: number;
}

export default registerAs<RateLimitConfig>('rateLimit', () => {
  validateConfig(process.env, EnvirontmentVariablesValidator);

  return {
    limit: process.env.RATE_LIMIT ? parseInt(process.env.RATE_LIMIT, 10) : 100,
    ttl: process.env.RATE_LIMIT_TTL ? parseInt(process.env.RATE_LIMIT_TTL, 10) : 60000,
  }
})