import { IsString } from "class-validator"
import { AuthGoogleConfig } from "./auth-google-config.type"
import { registerAs } from "@nestjs/config"
import validateConfig from "src/utils/validate-config"

class EnvValidator {
  @IsString()
  GOOGLE_CLIENT_ID: string
  @IsString()
  GOOGLE_CLIENT_SECRET: string
  @IsString()
  GOOGLE_CALLBACK_URL: string
}

export default registerAs<AuthGoogleConfig>('authGoogle', () => {
  validateConfig(process.env, EnvValidator);

  return {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
  }
})