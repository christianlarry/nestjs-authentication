import { AggregateRoot } from 'src/core/domain/aggregate-root.base';
import { AccountId } from '../value-objects/account-id.vo';
import { Email } from '../value-objects/email.vo';
import { Password } from '../value-objects/password.vo';
import { AuthProvider as AuthProviderVO } from '../value-objects/auth-provider.vo';
import { AccountStatus } from '../enums/account-status.enum';
import { Role } from '../enums/role.enum';
import { AuthProvider as AuthProviderName } from '../enums/auth-provider.enum';
import {
  CannotLoginError,
  CannotChangePasswordError,
  CannotResetPasswordError,
  CannotForgotPasswordError,
  CannotVerifyEmailError,
  CannotUnverifyEmailError,
  CannotAccessProtectedResourceError,
} from '../errors';
import {
  UserRegisteredEvent,
  UserCreatedFromOAuthEvent,
  UserLoggedInEvent,
  UserLoggedInWithOAuthEvent,
  EmailVerifiedEvent,
  EmailUnverifiedEvent,
  PasswordChangedEvent,
  PasswordResetEvent,
  OAuthProviderLinkedEvent,
  OAuthProviderUnlinkedEvent,
  UserActivatedEvent,
  UserDeactivatedEvent,
  UserSuspendedEvent,
  UserDeletedEvent,
} from '../events';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────
// Props & Params interfaces
// ─────────────────────────────────────────────

export interface AccountProps {
  email: Email;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  /** bcrypt-hashed password; null for OAuth-only accounts */
  password: Password | null;
  lastPasswordChangedAt: Date | null;
  role: Role;
  status: AccountStatus;
  /** Incremented on each failed login; reset on success */
  loginAttempts: number;
  /** Account is locked while now() < lockedUntil */
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  /** Encrypted TOTP secret — encryption happens at the application layer */
  twoFactorSecret: string | null;
  /** Hashed single-use backup codes */
  twoFactorBackupCodes: string[];
  providers: AuthProviderVO[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateAccountParams {
  email: string;
  hashedPassword: string;
}

export interface CreateAccountFromOAuthParams {
  email: string;
  provider: AuthProviderName;
  providerId: string;
  fullName: string;
}

// ─────────────────────────────────────────────
// Account Aggregate Root
// ─────────────────────────────────────────────

export class Account extends AggregateRoot {
  private readonly _id: AccountId;
  private props: AccountProps;

  private constructor(props: AccountProps, id?: AccountId) {
    super();
    this._id = id ?? AccountId.create();
    this.props = props;
    this.validate();
  }

  // ─────────────────────────────────────────────
  // Factory methods
  // ─────────────────────────────────────────────

  /** Create a new account via email/password registration. */
  public static create(params: CreateAccountParams): Account {
    const account = new Account({
      email: Email.create(params.email),
      emailVerified: false,
      emailVerifiedAt: null,
      password: Password.fromHash(params.hashedPassword),
      lastPasswordChangedAt: null,
      role: Role.USER,
      status: AccountStatus.PENDING_VERIFICATION,
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      providers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    account.addDomainEvent(
      new UserRegisteredEvent({
        userId: account._id.getValue(),
        email: params.email,
      }),
    );

    return account;
  }

  /** Create a new account via OAuth provider (email is pre-verified by the provider). */
  public static createFromOAuth(params: CreateAccountFromOAuthParams): Account {
    const now = new Date();
    const provider = AuthProviderVO.reconstruct(params.provider, params.providerId, now);

    const account = new Account({
      email: Email.create(params.email),
      emailVerified: true,
      emailVerifiedAt: now,
      password: null,
      lastPasswordChangedAt: null,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
      providers: [provider],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    account.addDomainEvent(
      new UserCreatedFromOAuthEvent({
        userId: account._id.getValue(),
        email: params.email,
        provider: params.provider,
        fullName: params.fullName,
        createdAt: now,
      }),
    );

    return account;
  }

  /** Reconstruct an Account from persisted data (no domain events emitted). */
  public static reconstruct(props: AccountProps, id: AccountId): Account {
    return new Account(props, id);
  }

  // ─────────────────────────────────────────────
  // Domain behaviors
  // ─────────────────────────────────────────────

  /** Marks the email as verified and transitions PENDING_VERIFICATION → ACTIVE. */
  public verifyEmail(): void {
    if (this.props.emailVerified) {
      throw new CannotVerifyEmailError('Email is already verified.');
    }
    if (
      this.props.status === AccountStatus.SUSPENDED ||
      this.props.status === AccountStatus.DELETED
    ) {
      throw new CannotVerifyEmailError(
        `Cannot verify email for an account with status "${this.props.status}".`,
      );
    }

    const now = new Date();
    this.props.emailVerified = true;
    this.props.emailVerifiedAt = now;

    if (this.props.status === AccountStatus.PENDING_VERIFICATION) {
      this.props.status = AccountStatus.ACTIVE;
    }

    this.applyChange();
    this.addDomainEvent(
      new EmailVerifiedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        verifiedAt: now,
      }),
    );
  }

  /** Revokes email verification (e.g. admin action or email change). */
  public unverifyEmail(): void {
    if (!this.props.emailVerified) {
      throw new CannotUnverifyEmailError('Email is not currently verified.');
    }

    this.props.emailVerified = false;
    this.props.emailVerifiedAt = null;
    this.applyChange();

    this.addDomainEvent(
      new EmailUnverifiedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
      }),
    );
  }

  /** Change the account password. Requires an active account with an existing password. */
  public changePassword(newHashedPassword: string): void {
    if (!this.props.password) {
      throw new CannotChangePasswordError(
        'Cannot change password on an OAuth-only account.',
      );
    }
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new CannotChangePasswordError(
        `Account must be active to change password. Current status: "${this.props.status}".`,
      );
    }

    const now = new Date();
    this.props.password = Password.fromHash(newHashedPassword);
    this.props.lastPasswordChangedAt = now;
    this.applyChange();

    this.addDomainEvent(
      new PasswordChangedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        changedAt: now,
      }),
    );
  }

  /**
   * Reset the account password (e.g. via forgot-password flow).
   * Clears any active lockout and resets login attempts.
   */
  public resetPassword(newHashedPassword: string): void {
    if (
      this.props.status === AccountStatus.DELETED ||
      this.props.status === AccountStatus.SUSPENDED
    ) {
      throw new CannotResetPasswordError(
        `Cannot reset password for an account with status "${this.props.status}".`,
      );
    }

    const now = new Date();
    this.props.password = Password.fromHash(newHashedPassword);
    this.props.lastPasswordChangedAt = now;
    this.props.loginAttempts = 0;
    this.props.lockedUntil = null;
    this.applyChange();

    this.addDomainEvent(
      new PasswordResetEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        resetAt: now,
      }),
    );
  }

  /** Increments failed login attempts and locks the account after MAX_LOGIN_ATTEMPTS. */
  public recordFailedLoginAttempt(): void {
    this.props.loginAttempts += 1;

    if (this.props.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.props.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }

    this.applyChange();
  }

  /** Resets login attempts and records a successful login timestamp. */
  public recordSuccessfulLogin(): void {
    const now = new Date();
    this.props.loginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = now;
    this.applyChange();

    this.addDomainEvent(
      new UserLoggedInEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        loginAt: now,
      }),
    );
  }

  /** Records a successful OAuth login and emits the appropriate domain event. */
  public recordSuccessfulOAuthLogin(
    provider: AuthProviderName,
    avatarUrl: string | null = null,
    fullName: string = '',
  ): void {
    const now = new Date();
    this.props.loginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.lastLoginAt = now;
    this.applyChange();

    this.addDomainEvent(
      new UserLoggedInWithOAuthEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        provider,
        avatarUrl,
        fullName,
      }),
    );
  }

  /**
   * Links a new OAuth provider to this account.
   * Idempotent: if the provider is already linked, this is a no-op.
   */
  public linkProvider(provider: AuthProviderVO): void {
    const alreadyLinked = this.props.providers.some(
      (p) => p.getProviderName() === provider.getProviderName(),
    );
    if (alreadyLinked) return;

    this.props.providers = [...this.props.providers, provider];
    this.applyChange();

    this.addDomainEvent(
      new OAuthProviderLinkedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        provider: provider.getProviderName(),
        linkedAt: provider.getLinkedAt(),
      }),
    );
  }

  /**
   * Unlinks an OAuth provider from this account.
   * Throws if attempting to remove the sole authentication method.
   */
  public unlinkProvider(providerName: AuthProviderName): void {
    const exists = this.props.providers.some(
      (p) => p.getProviderName() === providerName,
    );
    if (!exists) return;

    if (!this.props.password && this.props.providers.length === 1) {
      throw new CannotAccessProtectedResourceError(
        'Cannot unlink the last OAuth provider when no password is set.',
      );
    }

    this.props.providers = this.props.providers.filter(
      (p) => p.getProviderName() !== providerName,
    );
    this.applyChange();

    this.addDomainEvent(
      new OAuthProviderUnlinkedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        provider: providerName,
        unlinkedAt: new Date(),
      }),
    );
  }

  /** Activates the account (transitions from any non-DELETED status → ACTIVE). */
  public activate(): void {
    if (this.props.status === AccountStatus.ACTIVE) return;
    if (this.props.status === AccountStatus.DELETED) {
      throw new CannotLoginError('Deleted accounts cannot be reactivated.');
    }

    this.props.status = AccountStatus.ACTIVE;
    this.props.deletedAt = null;
    this.applyChange();

    this.addDomainEvent(
      new UserActivatedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        activatedAt: new Date(),
      }),
    );
  }

  /** Deactivates the account (ACTIVE → INACTIVE). */
  public deactivate(): void {
    if (this.props.status === AccountStatus.INACTIVE) return;
    if (
      this.props.status === AccountStatus.DELETED ||
      this.props.status === AccountStatus.SUSPENDED
    ) {
      throw new CannotLoginError(
        `Cannot deactivate an account with status "${this.props.status}".`,
      );
    }

    this.props.status = AccountStatus.INACTIVE;
    this.applyChange();

    this.addDomainEvent(
      new UserDeactivatedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        deactivatedAt: new Date(),
      }),
    );
  }

  /** Suspends the account (admin action). */
  public suspend(): void {
    if (this.props.status === AccountStatus.SUSPENDED) return;
    if (this.props.status === AccountStatus.DELETED) {
      throw new CannotLoginError('Deleted accounts cannot be suspended.');
    }

    this.props.status = AccountStatus.SUSPENDED;
    this.applyChange();

    this.addDomainEvent(
      new UserSuspendedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        suspendedAt: new Date(),
      }),
    );
  }

  /** Soft-deletes the account (irreversible in the domain). */
  public softDelete(): void {
    if (this.props.status === AccountStatus.DELETED) return;

    const now = new Date();
    this.props.status = AccountStatus.DELETED;
    this.props.deletedAt = now;
    this.applyChange();

    this.addDomainEvent(
      new UserDeletedEvent({
        userId: this._id.getValue(),
        email: this.props.email.getValue(),
        deletedAt: now,
      }),
    );
  }

  /** Enables TOTP two-factor authentication. */
  public enableTwoFactor(encryptedSecret: string, hashedBackupCodes: string[]): void {
    this.props.twoFactorEnabled = true;
    this.props.twoFactorSecret = encryptedSecret;
    this.props.twoFactorBackupCodes = [...hashedBackupCodes];
    this.applyChange();
  }

  /** Disables two-factor authentication and clears all related data. */
  public disableTwoFactor(): void {
    this.props.twoFactorEnabled = false;
    this.props.twoFactorSecret = null;
    this.props.twoFactorBackupCodes = [];
    this.applyChange();
  }

  // ─────────────────────────────────────────────
  // Domain guards (called by use-cases before executing sensitive operations)
  // ─────────────────────────────────────────────

  /** Asserts the account is eligible to log in. Throws CannotLoginError otherwise. */
  public assertCanLogin(): void {
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new CannotLoginError(
        `Account status is "${this.props.status}". Only active accounts can log in.`,
      );
    }
    if (!this.props.emailVerified) {
      throw new CannotLoginError('Email must be verified before logging in.');
    }
    if (this.isLocked) {
      throw new CannotLoginError(
        `Account is temporarily locked until ${this.props.lockedUntil?.toISOString()}.`,
      );
    }
  }

  /** Asserts that a forgot-password email can be sent. */
  public assertCanForgotPassword(): void {
    if (
      this.props.status === AccountStatus.DELETED ||
      this.props.status === AccountStatus.SUSPENDED
    ) {
      throw new CannotForgotPasswordError(
        `Cannot initiate password reset for an account with status "${this.props.status}".`,
      );
    }
    if (!this.props.emailVerified) {
      throw new CannotForgotPasswordError(
        'Email must be verified before requesting a password reset.',
      );
    }
  }

  /** Asserts that the password can be changed by the user. */
  public assertCanChangePassword(): void {
    if (!this.props.password) {
      throw new CannotChangePasswordError(
        'This account is OAuth-only and does not have a password to change.',
      );
    }
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new CannotChangePasswordError(
        `Account must be active to change password. Current status: "${this.props.status}".`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // Property getters
  // ─────────────────────────────────────────────

  public get id(): AccountId {
    return this._id;
  }

  public get email(): Email {
    return this.props.email;
  }

  public get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  public get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt;
  }

  public get password(): Password | null {
    return this.props.password;
  }

  public get lastPasswordChangedAt(): Date | null {
    return this.props.lastPasswordChangedAt;
  }

  public get role(): Role {
    return this.props.role;
  }

  public get status(): AccountStatus {
    return this.props.status;
  }

  public get loginAttempts(): number {
    return this.props.loginAttempts;
  }

  public get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  public get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  public get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled;
  }

  public get twoFactorSecret(): string | null {
    return this.props.twoFactorSecret;
  }

  public get twoFactorBackupCodes(): string[] {
    return [...this.props.twoFactorBackupCodes];
  }

  public get providers(): AuthProviderVO[] {
    return [...this.props.providers];
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  // ─────────────────────────────────────────────
  // Computed state checks
  // ─────────────────────────────────────────────

  /** True while the lockout window has not yet expired. */
  public get isLocked(): boolean {
    return !!this.props.lockedUntil && this.props.lockedUntil > new Date();
  }

  public get isActive(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  public get isPendingVerification(): boolean {
    return this.props.status === AccountStatus.PENDING_VERIFICATION;
  }

  public get isSuspended(): boolean {
    return this.props.status === AccountStatus.SUSPENDED;
  }

  public get isDeleted(): boolean {
    return this.props.status === AccountStatus.DELETED;
  }

  /** True if the account has a hashed password (i.e. not OAuth-only). */
  public get hasPassword(): boolean {
    return this.props.password !== null;
  }

  /** Returns true if the given OAuth provider is linked to this account. */
  public hasProvider(providerName: AuthProviderName): boolean {
    return this.props.providers.some((p) => p.getProviderName() === providerName);
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private applyChange(): void {
    this.props.updatedAt = new Date();
    this.validate();
  }

  private validate(): void {
    if (this.props.status === AccountStatus.DELETED && !this.props.deletedAt) {
      throw new Error('Invariant violation: a DELETED account must have a deletedAt timestamp.');
    }
    if (this.props.emailVerified && !this.props.emailVerifiedAt) {
      throw new Error('Invariant violation: a verified email must have an emailVerifiedAt timestamp.');
    }
    if (this.props.twoFactorEnabled && !this.props.twoFactorSecret) {
      throw new Error('Invariant violation: two-factor authentication requires a secret.');
    }
  }
}