import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/core/infrastructure/persistence/prisma/prisma.service';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entity/user.entity';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PrismaUserMapper } from '../mapper/prisma-user.mapper';

export { USER_REPOSITORY_TOKEN };

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  // ─────────────────────────────────────────────
  // Read operations
  // ─────────────────────────────────────────────

  async findById(id: UserId): Promise<User | null> {
    const raw = await this.prisma.getClient().user.findUnique({
      where: { id: id.getValue() },
      include: { addresses: true },
    });

    return raw ? PrismaUserMapper.toDomain(raw) : null;
  }

  async findByAccountId(accountId: string): Promise<User | null> {
    const raw = await this.prisma.getClient().user.findUnique({
      where: { accountId },
      include: { addresses: true },
    });

    return raw ? PrismaUserMapper.toDomain(raw) : null;
  }

  // ─────────────────────────────────────────────
  // Write operations
  // ─────────────────────────────────────────────

  /**
   * Persist (insert or update) the User aggregate.
   *
   * Address synchronisation strategy: deleteMany + create.
   * Addresses are a bounded collection owned by the User aggregate.
   * Replacing them atomically on every save keeps the repository simple
   * and consistent without requiring per-address diff logic.
   *
   * Domain events are dispatched after the transaction commits.
   */
  async save(user: User): Promise<void> {
    const data = PrismaUserMapper.toPersistence(user);
    const { id, ...updateData } = data;

    const addressWrites = user.addresses.map((a) =>
      PrismaUserMapper.addressToPersistence(a, id),
    );

    // Strip userId from the nested create payload (Prisma derives it from the relation)
    const addressCreatePayloads = addressWrites.map(({ userId, ...rest }) => rest);

    await this.prisma.getClient().user.upsert({
      where: { id },
      create: {
        ...data,
        addresses: {
          create: addressCreatePayloads,
        },
      },
      update: {
        ...updateData,
        addresses: {
          deleteMany: {},
          create: addressCreatePayloads,
        },
      },
    });

    const events = user.pullDomainEvents();
    for (const event of events) {
      await this.eventEmitter.emitAsync(event.name, event);
    }
  }

  /**
   * Hard-delete a user profile by ID.
   * All child addresses are cascade-deleted by the DB.
   */
  async delete(id: UserId): Promise<void> {
    await this.prisma.getClient().user.delete({
      where: { id: id.getValue() },
    });
  }
}
