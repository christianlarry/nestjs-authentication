import { IsString } from "class-validator"
import validateConfig from "src/utils/validate-config"
import { registerAs } from "@nestjs/config"
import { AuthFacebookConfig } from "./types/auth-facebook.config.type"

class EnvValidator {
  @IsString()
  FACEBOOK_CLIENT_ID: string
  @IsString()
  FACEBOOK_CLIENT_SECRET: string
  @IsString()
  FACEBOOK_CALLBACK_URL: string
}

export default registerAs<AuthFacebookConfig>('authFacebook', () => {
  validateConfig(process.env, EnvValidator);

  return {
    clientID: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '',
  }
})