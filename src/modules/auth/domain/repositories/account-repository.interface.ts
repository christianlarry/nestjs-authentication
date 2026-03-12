import { Account } from '../entity/account.entity';
import { AccountId } from '../value-objects/account-id.vo';
import { Email } from '../value-objects/email.vo';

export const ACCOUNT_REPOSITORY_TOKEN = Symbol('ACCOUNT_REPOSITORY');

/**
 * Command repository for the Account aggregate.
 * Returns full entities for domain operations (write side of CQRS).
 */
export interface AccountRepository {
  /** Find an account by its aggregate ID. Returns null if not found. */
  findById(id: AccountId): Promise<Account | null>;

  /** Find an account by email address. Returns null if not found. */
  findByEmail(email: Email): Promise<Account | null>;

  /** Returns true if an account with the given email already exists. */
  existsByEmail(email: Email): Promise<boolean>;

  /** Persist (insert or update) an account and dispatch any queued domain events. */
  save(account: Account): Promise<void>;

  /** Hard-delete an account by ID (use Account.softDelete() for soft-deletion). */
  delete(id: AccountId): Promise<void>;
}
