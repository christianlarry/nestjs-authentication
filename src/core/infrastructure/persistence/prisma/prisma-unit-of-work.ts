import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { prismaCls } from "./prisma.cls";
import { UnitOfWork } from "src/core/application/unit-of-work.interface";

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {

  constructor(
    private readonly prisma: PrismaService
  ) { }

  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (txPrisma) => {
      return prismaCls.run(txPrisma, async () => {
        return work();
      })
    });
  }
}