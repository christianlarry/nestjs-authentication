import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/infrastructure/persistence/prisma/prisma.service';
import {
  AccountQueryRepository,
  AccountDetailResult,
  AccountListItemResult,
  FindAllAccountsQuery,
  FindAllAccountsResult,
  ACCOUNT_QUERY_REPOSITORY_TOKEN,
} from '../../domain/repositories/account-query-repository.interface';

export { ACCOUNT_QUERY_REPOSITORY_TOKEN };

@Injectable()
export class PrismaAccountQueryRepository implements AccountQueryRepository {
  constructor(private readonly prisma: PrismaService) { }

  // ─────────────────────────────────────────────
  // Single-record reads
  // ─────────────────────────────────────────────

  async findById(id: string): Promise<AccountDetailResult | null> {
    const raw = await this.prisma.getClient().account.findUnique({
      where: { id },
      include: { providers: true },
    });

    return raw ? this.toDetailResult(raw) : null;
  }

  async findByEmail(email: string): Promise<AccountDetailResult | null> {
    const raw = await this.prisma.getClient().account.findUnique({
      where: { email },
      include: { providers: true },
    });

    return raw ? this.toDetailResult(raw) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.getClient().account.count({
      where: { email },
    });

    return count > 0;
  }

  // ─────────────────────────────────────────────
  // List / paginated read
  // ─────────────────────────────────────────────

  async findAll(query: FindAllAccountsQuery): Promise<FindAllAccountsResult> {
    const {
      skip = 0,
      take = 20,
      search,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where = {
      ...(search && {
        email: { contains: search, mode: 'insensitive' as const },
      }),
      ...(status && { status: status as never }),
      ...(role && { role: role as never }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.getClient().account.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.getClient().account.count({ where }),
    ]);

    const data: AccountListItemResult[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      status: r.status,
      createdAt: r.createdAt,
    }));

    return { data, total };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private toDetailResult(
    raw: Awaited<ReturnType<typeof this.prisma.account.findUnique>> & {
      providers: { provider: string; providerId: string; linkedAt: Date }[];
    },
  ): AccountDetailResult {
    return {
      id: raw!.id,
      email: raw!.email,
      emailVerified: raw!.emailVerified,
      emailVerifiedAt: raw!.emailVerifiedAt,
      role: raw!.role,
      status: raw!.status,
      twoFactorEnabled: raw!.twoFactorEnabled,
      providers: raw!.providers.map((p) => ({
        provider: p.provider,
        providerId: p.providerId,
        linkedAt: p.linkedAt,
      })),
      lastLoginAt: raw!.lastLoginAt,
      createdAt: raw!.createdAt,
      updatedAt: raw!.updatedAt,
    };
  }
}
