import { PrismaClient } from "./generated/client/client";
import { TransactionClient } from "./generated/client/internal/prismaNamespace";
import { PrismaService } from "./prisma.service";

export abstract class PrismaRepositoryBase {
  protected client: PrismaClient | TransactionClient;

  constructor(
    private readonly prisma: PrismaService
  ) {
    this.client = prisma.getClient();
  }
}