import type {
  Account as PrismaAccount,
  AuthProvider as PrismaAuthProvider,
} from 'src/core/infrastructure/persistence/prisma/generated/client/client';
import type {
  AuthProviderName,
  Role as PrismaRole,
  AccountStatus as PrismaAccountStatus,
} from 'src/core/infrastructure/persistence/prisma/generated/client/enums';
import { Account } from '../../domain/entity/account.entity';
import { AccountId } from '../../domain/value-objects/account-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { AuthProvider as AuthProviderVO } from '../../domain/value-objects/auth-provider.vo';
import { AuthProvider as AuthProviderEnum } from '../../domain/enums/auth-provider.enum';
import { AccountStatus } from '../../domain/enums/account-status.enum';
import { Role } from '../../domain/enums/role.enum';

// ─────────────────────────────────────────────
// Raw Prisma type with included relations
// ─────────────────────────────────────────────

export type PrismaAccountWithProviders = PrismaAccount & {
  providers: PrismaAuthProvider[];
};

// ─────────────────────────────────────────────
// Persistence shape returned by toPersistence
// ─────────────────────────────────────────────

export interface AccountPersistenceData {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  password: string | null;
  lastPasswordChangedAt: Date | null;
  role: PrismaRole;
  status: PrismaAccountStatus;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorBackupCodes: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProviderPersistenceData {
  provider: AuthProviderName;
  providerId: string;
  linkedAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────
// Mapper
// ─────────────────────────────────────────────

export class PrismaAccountMapper {
  /**
   * Reconstruct an Account domain entity from a raw Prisma row (+ providers relation).
   * Never emits domain events.
   */
  static toDomain(raw: PrismaAccountWithProviders): Account {
    const providers = raw.providers.map((p) =>
      AuthProviderVO.reconstruct(p.provider as AuthProviderEnum, p.providerId, p.linkedAt),
    );

    return Account.reconstruct(
      {
        email: Email.create(raw.email),
        emailVerified: raw.emailVerified,
        emailVerifiedAt: raw.emailVerifiedAt,
        password: raw.password ? Password.fromHash(raw.password) : null,
        lastPasswordChangedAt: raw.lastPasswordChangedAt,
        role: raw.role as Role,
        status: raw.status as AccountStatus,
        loginAttempts: raw.loginAttempts,
        lockedUntil: raw.lockedUntil,
        lastLoginAt: raw.lastLoginAt,
        twoFactorEnabled: raw.twoFactorEnabled,
        twoFactorSecret: raw.twoFactorSecret,
        twoFactorBackupCodes: raw.twoFactorBackupCodes,
        providers,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        deletedAt: raw.deletedAt,
      },
      AccountId.fromString(raw.id),
    );
  }

  /**
   * Flatten account scalar fields to a plain object suitable for Prisma create/update.
   * Providers are intentionally excluded — the repository manages them separately
   * via nested writes to support the deleteMany + create sync strategy.
   */
  static toPersistence(account: Account): AccountPersistenceData {
    return {
      id: account.id.getValue(),
      email: account.email.getValue(),
      emailVerified: account.emailVerified,
      emailVerifiedAt: account.emailVerifiedAt,
      password: account.password?.getValue() ?? null,
      lastPasswordChangedAt: account.lastPasswordChangedAt,
      role: account.role as PrismaRole,
      status: account.status as PrismaAccountStatus,
      loginAttempts: account.loginAttempts,
      lockedUntil: account.lockedUntil,
      lastLoginAt: account.lastLoginAt,
      twoFactorEnabled: account.twoFactorEnabled,
      twoFactorSecret: account.twoFactorSecret,
      twoFactorBackupCodes: account.twoFactorBackupCodes,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
    };
  }

  /**
   * Map an AuthProvider value object to its Prisma-ready shape for nested writes.
   */
  static providerToPersistence(provider: AuthProviderVO): ProviderPersistenceData {
    return {
      provider: provider.getProviderName() as AuthProviderName,
      providerId: provider.getProviderId(),
      linkedAt: provider.getLinkedAt(),
      updatedAt: new Date(),
    };
  }
}
