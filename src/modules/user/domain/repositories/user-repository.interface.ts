import { User } from '../entity/user.entity';
import { UserId } from '../value-objects/user-id.vo';

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY');

/**
 * Command repository for the User aggregate.
 * Returns full entities for domain operations (write side of CQRS).
 */
export interface IUserRepository {
  /** Find a user profile by its aggregate ID. Returns null if not found. */
  findById(id: UserId): Promise<User | null>;

  /** Find a user profile by the linked Account ID. Returns null if not found. */
  findByAccountId(accountId: string): Promise<User | null>;

  /** Persist (insert or update) a user and dispatch any queued domain events. */
  save(user: User): Promise<void>;

  /** Hard-delete a user profile by ID. */
  delete(id: UserId): Promise<void>;
}
