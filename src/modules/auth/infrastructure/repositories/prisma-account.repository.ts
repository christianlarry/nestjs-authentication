import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/core/infrastructure/persistence/prisma/prisma.service';
import {
  AccountRepository,
  ACCOUNT_REPOSITORY_TOKEN,
} from '../../domain/repositories/account-repository.interface';
import { Account } from '../../domain/entity/account.entity';
import { AccountId } from '../../domain/value-objects/account-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { PrismaAccountMapper } from '../mapper/prisma-account.mapper';

export { ACCOUNT_REPOSITORY_TOKEN };

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  // ─────────────────────────────────────────────
  // Read operations
  // ─────────────────────────────────────────────

  async findById(id: AccountId): Promise<Account | null> {
    const raw = await this.prisma.getClient().account.findUnique({
      where: { id: id.getValue() },
      include: { providers: true },
    });

    return raw ? PrismaAccountMapper.toDomain(raw) : null;
  }

  async findByEmail(email: Email): Promise<Account | null> {
    const raw = await this.prisma.getClient().account.findUnique({
      where: { email: email.getValue() },
      include: { providers: true },
    });

    return raw ? PrismaAccountMapper.toDomain(raw) : null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.prisma.getClient().account.count({
      where: { email: email.getValue() },
    });

    return count > 0;
  }

  // ─────────────────────────────────────────────
  // Write operations
  // ─────────────────────────────────────────────

  /**
   * Persist (insert or update) the Account aggregate.
   *
   * Provider synchronisation strategy: deleteMany + create.
   * Providers are a small, bounded collection owned by the Account aggregate,
   * so replacing them atomically on every save is simpler and correct.
   *
   * Domain events are dispatched after the transaction commits.
   */
  async save(account: Account): Promise<void> {
    const data = PrismaAccountMapper.toPersistence(account);

    const { id, ...updateData } = data;

    const providerWrites = account.providers.map((p) =>
      PrismaAccountMapper.providerToPersistence(p),
    );

    await this.prisma.getClient().account.upsert({
      where: { id },
      create: {
        ...data,
        providers: {
          create: providerWrites,
        },
      },
      update: {
        ...updateData,
        providers: {
          deleteMany: {},
          createMany: {
            data: providerWrites,
          },
        },
      },
    });

    const events = account.pullDomainEvents();
    for (const event of events) {
      await this.eventEmitter.emitAsync(event.name, event);
    }
  }

  /**
   * Hard-delete an account by ID.
   * All related rows (providers, refresh tokens, etc.) are cascade-deleted by the DB.
   */
  async delete(id: AccountId): Promise<void> {
    await this.prisma.getClient().account.delete({
      where: { id: id.getValue() },
    });
  }
}
