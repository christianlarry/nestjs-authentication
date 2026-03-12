import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/infrastructure/persistence/prisma/prisma.service';
import {
  IUserQueryRepository,
  UserProfileResult,
  UserListItemResult,
  AddressResult,
  FindAllUsersQuery,
  FindAllUsersResult,
  USER_QUERY_REPOSITORY_TOKEN,
} from '../../domain/repositories/user-query-repository.interface';

export { USER_QUERY_REPOSITORY_TOKEN };

@Injectable()
export class PrismaUserQueryRepository implements IUserQueryRepository {
  constructor(private readonly prisma: PrismaService) { }

  // ─────────────────────────────────────────────
  // Single-record reads
  // ─────────────────────────────────────────────

  async findById(id: string): Promise<UserProfileResult | null> {
    const raw = await this.prisma.getClient().user.findUnique({
      where: { id },
      include: { addresses: true },
    });

    return raw ? this.toProfileResult(raw) : null;
  }

  async findByAccountId(accountId: string): Promise<UserProfileResult | null> {
    const raw = await this.prisma.getClient().user.findUnique({
      where: { accountId },
      include: { addresses: true },
    });

    return raw ? this.toProfileResult(raw) : null;
  }

  // ─────────────────────────────────────────────
  // List / paginated read
  // ─────────────────────────────────────────────

  async findAll(query: FindAllUsersQuery): Promise<FindAllUsersResult> {
    const {
      skip = 0,
      take = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where = {
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.getClient().user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          accountId: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.getClient().user.count({ where }),
    ]);

    const data: UserListItemResult[] = rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      createdAt: r.createdAt,
    }));

    return { data, total };
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private toProfileResult(
    raw: Awaited<ReturnType<typeof this.prisma.user.findUnique>> & {
      addresses: {
        id: string;
        label: string;
        recipient: string;
        phone: string;
        street: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
        latitude: { toNumber(): number } | null;
        longitude: { toNumber(): number } | null;
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
      }[];
    },
  ): UserProfileResult {
    const addresses: AddressResult[] = raw!.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      street: a.street,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode,
      country: a.country,
      latitude: a.latitude !== null ? a.latitude.toNumber() : null,
      longitude: a.longitude !== null ? a.longitude.toNumber() : null,
      isDefault: a.isDefault,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return {
      id: raw!.id,
      accountId: raw!.accountId,
      name: raw!.name,
      gender: raw!.gender,
      dateOfBirth: raw!.dateOfBirth,
      phoneNumber: raw!.phoneNumber,
      avatarUrl: raw!.avatarUrl,
      addresses,
      createdAt: raw!.createdAt,
      updatedAt: raw!.updatedAt,
      deletedAt: raw!.deletedAt,
    };
  }
}
