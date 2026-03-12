import { Global, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Membuat module ini global, tidak perlu import berulang
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export agar bisa digunakan module lain
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaModule.name);
  constructor(private readonly prismaService: PrismaService) { }

  async onModuleInit() {
    try {
      await this.prismaService.$connect();
      this.logger.log('Prisma connected to the database.');
    } catch (err) {
      this.logger.error('Prisma failed to connect to the database.', err);
    }
  }

  async onModuleDestroy() {
    try {
      await this.prismaService.$disconnect();
      this.logger.log('Prisma disconnected from the database.');
    } catch (err) {
      this.logger.error('Prisma failed to disconnect from the database.', err);
    }
  }
}
