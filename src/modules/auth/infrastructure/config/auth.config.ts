import { registerAs } from "@nestjs/config"
import { IsInt, IsPositive, IsString, Max, Min } from "class-validator"
import validateConfig from "src/utils/validate-config"
import { AuthConfig } from "./types/auth-config.type"

class EnvironmentVariablesValidator {
  @IsString()
  ACCESS_TOKEN_SECRET: string

  @IsString()
  REFRESH_TOKEN_SECRET: string

  @IsString()
  VERIFICATION_TOKEN_SECRET: string

  @IsString()
  FORGOT_PASSWORD_TOKEN_SECRET: string

  @IsInt()
  @Min(1)
  @Max(1440)
  @IsPositive()
  ACCESS_TOKEN_EXPIRATION_MINUTES: number

  @IsInt()
  @Min(1)
  @Max(365)
  @IsPositive()
  REFRESH_TOKEN_EXPIRATION_DAYS: number

  @IsInt()
  @Min(1)
  @Max(168)
  @IsPositive()
  VERIFICATION_TOKEN_EXPIRATION_HOURS: number

  @IsInt()
  @Min(1)
  @Max(168)
  @IsPositive()
  FORGOT_PASSWORD_TOKEN_EXPIRATION_HOURS: number
}

export default registerAs<AuthConfig>('auth', () => {
  // Validate environment variables
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    accessTokenExpirationMinutes: process.env.ACCESS_TOKEN_EXPIRATION_MINUTES
      ? parseInt(process.env.ACCESS_TOKEN_EXPIRATION_MINUTES, 10) : 15,
    refreshTokenExpirationDays: process.env.REFRESH_TOKEN_EXPIRATION_DAYS
      ? parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS, 10) : 30,
    verificationTokenSecret: process.env.VERIFICATION_TOKEN_SECRET || 'default_verification_token_secret',
    verificationTokenExpirationHours: process.env.VERIFICATION_TOKEN_EXPIRATION_HOURS
      ? parseInt(process.env.VERIFICATION_TOKEN_EXPIRATION_HOURS, 10) : 24,
    forgotPasswordTokenSecret: process.env.FORGOT_PASSWORD_TOKEN_SECRET || 'default_forgot_password_token_secret',
    forgotPasswordTokenExpirationHours: process.env.FORGOT_PASSWORD_TOKEN_EXPIRATION_HOURS
      ? parseInt(process.env.FORGOT_PASSWORD_TOKEN_EXPIRATION_HOURS, 10) : 1,
  }
})