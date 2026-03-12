import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaErrorCode } from "./errors/prisma-error-code.enum";
import { prismaCls } from "./prisma.cls";
import { AllConfigType } from "src/core/config/config.type";
import { PrismaClient } from "./generated/client/client";
import { TransactionClient } from "./generated/client/internal/prismaNamespace";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";

@Injectable()
export class PrismaService extends PrismaClient {

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    const DATABASE_URL = configService.getOrThrow('prisma.databaseUrl', { infer: true });

    const adapter = new PrismaPg({ connectionString: DATABASE_URL });

    super({ adapter });
  }

  getClient(): PrismaClient | TransactionClient {
    return prismaCls.getStore() ?? this;
  }

  isPrismaUniqueError(err: unknown, fieldName?: string): boolean {
    return (
      err instanceof PrismaClientKnownRequestError &&
      err.code === PrismaErrorCode.UNIQUE_CONSTRAINT_VIOLATION &&
      (fieldName ? (err.meta?.target as string[])?.includes(fieldName) : true)
    )
  }

  isPrismaRecordNotFoundError(err: unknown): boolean {
    return (
      err instanceof PrismaClientKnownRequestError &&
      err.code === PrismaErrorCode.RECORD_NOT_FOUND
    )
  }
}