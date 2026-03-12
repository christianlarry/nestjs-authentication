import { registerAs } from "@nestjs/config";
import { IsString } from "class-validator";
import { PrismaConfig } from "./prisma-config.type";
import validateConfig from "src/utils/validate-config";

class EnvironmentVariablesValidator {
  @IsString()
  DATABASE_URL: string;
}

export default registerAs<PrismaConfig>('prisma', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    databaseUrl: process.env.DATABASE_URL!
  }
})