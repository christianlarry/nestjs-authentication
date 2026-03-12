# Domain Layer Implementation — Account & User Bounded Contexts

> **Status:** Completed — Domain layer fully implemented following DDD & Clean Architecture principles.

---

## Table of Contents

- [Overview](#overview)
- [Account Bounded Context](#account-bounded-context)
  - [Enums](#account-enums)
  - [Value Objects](#account-value-objects)
  - [Domain Errors](#account-domain-errors)
  - [Domain Events](#account-domain-events)
  - [Aggregate Root: Account](#aggregate-root-account)
  - [Repository Interfaces](#account-repository-interfaces)
- [User Bounded Context](#user-bounded-context)
  - [Enums](#user-enums)
  - [Value Objects](#user-value-objects)
  - [Domain Errors](#user-domain-errors)
  - [Domain Events](#user-domain-events)
  - [Entities: User & Address](#entities-user--address)
  - [Repository Interfaces](#user-repository-interfaces)
- [Design Decisions](#design-decisions)
- [Next Steps](#next-steps)

---

## Overview

The domain layer represents the core business logic with zero dependency on frameworks or infrastructure. Both bounded contexts follow these invariants:

| Principle | Implementation |
|---|---|
| **Aggregate Root** | Extends `AggregateRoot` base, accumulates `DomainEvent[]` |
| **Props pattern** | `private props: XxxProps` — single encapsulated state object |
| **Property getters** | `get id()` syntax, never `getId()` functions |
| **Factory methods** | `static create()` for new aggregates, `static reconstruct()` for hydration from persistence |
| **Value Objects** | Private constructor + static factory + `equals()` + throws domain-specific errors |
| **Enums** | `const` object + type export — not TypeScript `enum` — matching Prisma enum values |
| **CQRS Repositories** | Separate command (entity-returning) and query (DTO-returning) interfaces |
| **Domain Events** | Typed payload interfaces, past-tense names, emitted on every state-changing operation |

---

## Account Bounded Context

Located at: `src/modules/account/domain/`

### Account Enums

| File | Values |
|---|---|
| `enums/auth-provider.enum.ts` | `GOOGLE`, `FACEBOOK`, `GITHUB` |
| `enums/account-status.enum.ts` | `ACTIVE`, `INACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `DELETED` |
| `enums/role.enum.ts` | `USER`, `ADMIN` |
| `enums/index.ts` | Barrel export |

> All enum string values match the Prisma schema enum names exactly to avoid mapping overhead.

### Account Value Objects

| VO | Validation | Throws |
|---|---|---|
| `AccountId` | UUID v4 format | `InvalidAuthStateError` |
| `Email` | RFC-style email regex | `InvalidEmailError` |
| `Password` | Wraps bcrypt hash — raw validation via `Password.validateRaw()` | `PasswordTooWeakError` |
| `Name` | 3–100 chars, letters/spaces/apostrophes/hyphens | `InvalidNameError` |
| `AuthProvider` | providerName ∈ `{GOOGLE, FACEBOOK, GITHUB}` | `InvalidProviderError` |

**AuthProvider VO factory methods:**
```typescript
AuthProvider.createGoogleProvider(providerId)
AuthProvider.createFacebookProvider(providerId)
AuthProvider.createGithubProvider(providerId)    // new
AuthProvider.reconstruct(provider, providerId, linkedAt)
```

### Account Domain Errors

All extend `DomainError` and have a unique error code from `AuthErrorCode`.

| Error Class | Code |
|---|---|
| `InvalidCredentialsError` | `AUTH_INVALID_CREDENTIALS` |
| `PasswordTooWeakError` | `AUTH_PASSWORD_TOO_WEAK` |
| `InvalidEmailError` | `AUTH_INVALID_EMAIL` |
| `InvalidNameError` | `AUTH_INVALID_NAME` |
| `InvalidProviderError` | `AUTH_INVALID_PROVIDER` |
| `InvalidAuthStateError` | `AUTH_INVALID_AUTH_STATE` |
| `EmailAlreadyInUseError` | `AUTH_EMAIL_ALREADY_IN_USE` |
| `AuthUserNotFoundError` | `AUTH_USER_NOT_FOUND` |
| `EmailNotVerifiedError` | `AUTH_EMAIL_NOT_VERIFIED` |
| `CannotVerifyEmailError` | `AUTH_CANNOT_VERIFY_EMAIL` |
| `CannotUnverifyEmailError` | `AUTH_CANNOT_UNVERIFY_EMAIL` |
| `CannotLoginError` | `AUTH_CANNOT_LOGIN` |
| `CannotForgotPasswordError` | `AUTH_CANNOT_FORGOT_PASSWORD` |
| `CannotChangePasswordError` | `AUTH_CANNOT_CHANGE_PASSWORD` |
| `CannotResetPasswordError` | `AUTH_CANNOT_RESET_PASSWORD` |
| `CannotRefreshTokenError` | `AUTH_CANNOT_REFRESH_TOKEN` |
| `CannotAccessProtectedResourceError` | `AUTH_CANNOT_ACCESS_PROTECTED_RESOURCE` |
| `AccessTokenInvalidError` | `AUTH_ACCESS_TOKEN_INVALID` |
| `InvalidVerificationTokenError` | `AUTH_INVALID_VERIFICATION_TOKEN` |
| `InvalidResetPasswordTokenError` | `AUTH_INVALID_RESET_PASSWORD_TOKEN` |

### Account Domain Events

All extend `DomainEvent<Payload>` with a typed payload interface.

| Event | Trigger |
|---|---|
| `UserRegisteredEvent` | `Account.create()` — email/password registration |
| `UserCreatedFromOAuthEvent` | `Account.createFromOAuth()` — first OAuth sign-in |
| `UserLoggedInEvent` | `Account.recordSuccessfulLogin()` |
| `UserLoggedInWithOAuthEvent` | `Account.recordSuccessfulOAuthLogin()` |
| `EmailVerifiedEvent` | `Account.verifyEmail()` |
| `EmailUnverifiedEvent` | `Account.unverifyEmail()` |
| `PasswordChangedEvent` | `Account.changePassword()` |
| `PasswordResetEvent` | `Account.resetPassword()` |
| `OAuthProviderLinkedEvent` | `Account.linkProvider()` |
| `OAuthProviderUnlinkedEvent` | `Account.unlinkProvider()` |
| `UserActivatedEvent` | `Account.activate()` |
| `UserDeactivatedEvent` | `Account.deactivate()` |
| `UserSuspendedEvent` | `Account.suspend()` |
| `UserDeletedEvent` | `Account.softDelete()` |
| `AuthUserUpdatedEvent` | (reserved — for infrastructure use) |

### Aggregate Root: Account

**File:** `entity/account.entity.ts`

#### Props

```typescript
interface AccountProps {
  email: Email;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  password: Password | null;          // null for OAuth-only accounts
  lastPasswordChangedAt: Date | null;
  role: Role;
  status: AccountStatus;
  loginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;     // encrypted at app layer
  twoFactorBackupCodes: string[];     // hashed at app layer
  providers: AuthProvider[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

#### Factory Methods

| Method | Description |
|---|---|
| `Account.create(params)` | Email/password registration — status `PENDING_VERIFICATION` |
| `Account.createFromOAuth(params)` | OAuth registration — status `ACTIVE`, email pre-verified |
| `Account.reconstruct(props, id)` | Hydrate from persistence — no events emitted |

#### Business Methods

| Method | Guard / Throws |
|---|---|
| `verifyEmail()` | Throws `CannotVerifyEmailError` if already verified or account deleted/suspended |
| `unverifyEmail()` | Throws `CannotUnverifyEmailError` if not verified |
| `changePassword(hash)` | Throws `CannotChangePasswordError` if OAuth-only or not active |
| `resetPassword(hash)` | Throws `CannotResetPasswordError` if deleted/suspended; clears lockout |
| `recordFailedLoginAttempt()` | Locks account after 5 failures for 30 minutes |
| `recordSuccessfulLogin()` | Resets attempts & lockout |
| `recordSuccessfulOAuthLogin(provider)` | Variant for OAuth flow |
| `linkProvider(authProvider)` | Idempotent; emits `OAuthProviderLinkedEvent` |
| `unlinkProvider(providerName)` | Throws `CannotAccessProtectedResourceError` if it's the last auth method |
| `activate()` | Idempotent; throws for DELETED accounts |
| `deactivate()` | Idempotent; throws for DELETED/SUSPENDED |
| `suspend()` | Idempotent; throws for DELETED |
| `softDelete()` | Idempotent; sets `deletedAt` |
| `enableTwoFactor(secret, codes)` | Stores encrypted secret and hashed backup codes |
| `disableTwoFactor()` | Clears all 2FA data |

#### Domain Guard Methods (for use-cases)

| Method | Throws |
|---|---|
| `assertCanLogin()` | `CannotLoginError` — status not ACTIVE, email not verified, or locked |
| `assertCanForgotPassword()` | `CannotForgotPasswordError` — deleted/suspended or email not verified |
| `assertCanChangePassword()` | `CannotChangePasswordError` — OAuth-only or not active |

#### Computed Properties

```typescript
get isLocked(): boolean         // lockedUntil != null && lockedUntil > now
get isActive(): boolean
get isPendingVerification(): boolean
get isSuspended(): boolean
get isDeleted(): boolean
get hasPassword(): boolean
hasProvider(name: AuthProviderName): boolean
```

#### Domain Invariants (validated on every `applyChange()`)

1. `DELETED` status → `deletedAt` must be set
2. `emailVerified = true` → `emailVerifiedAt` must be set
3. `twoFactorEnabled = true` → `twoFactorSecret` must not be null

### Account Repository Interfaces

**CQRS separation** — two distinct interfaces with different DI tokens.

#### `IAccountRepository` (command side)

Token: `ACCOUNT_REPOSITORY_TOKEN`

```typescript
findById(id: AccountId): Promise<Account | null>
findByEmail(email: Email): Promise<Account | null>
existsByEmail(email: Email): Promise<boolean>
save(account: Account): Promise<void>
delete(id: AccountId): Promise<void>
```

#### `IAccountQueryRepository` (query side)

Token: `ACCOUNT_QUERY_REPOSITORY_TOKEN`

```typescript
findById(id: string): Promise<AccountDetailResult | null>
findByEmail(email: string): Promise<AccountDetailResult | null>
existsByEmail(email: string): Promise<boolean>
findAll(query: FindAllAccountsQuery): Promise<FindAllAccountsResult>
```

Returns plain DTOs: `AccountDetailResult`, `AccountListItemResult`, `FindAllAccountsResult`.

---

## User Bounded Context

Located at: `src/modules/user/domain/`

### User Enums

| File | Values |
|---|---|
| `enums/gender.enum.ts` | `MALE`, `FEMALE` |
| `enums/index.ts` | Barrel export |

### User Value Objects

| VO | Validation | Throws |
|---|---|---|
| `UserId` | UUID v4 format | `UserNotFoundError` |
| `AddressId` | UUID v4 format | `InvalidAddressError` |
| `Name` | 3–100 chars, letters/spaces/apostrophes/hyphens | `InvalidUserNameError` |
| `PhoneNumber` | 7–20 chars, `+` prefix optional, digits/spaces/hyphens/parens | `InvalidPhoneNumberError` |
| `AvatarUrl` | Valid HTTP/HTTPS URL, max 1000 chars | `InvalidAvatarUrlError` |

> **Note on `Name` duplication:** The `Name` VO exists in both `account/domain` (used during registration/OAuth) and `user/domain` (used for user profile). Each has its own domain-specific error type. This is intentional per DDD bounded context isolation.

### User Domain Errors

| Error Class | Code |
|---|---|
| `UserNotFoundError` | `USER_NOT_FOUND` |
| `InvalidUserNameError` | `USER_INVALID_NAME` |
| `InvalidPhoneNumberError` | `USER_INVALID_PHONE_NUMBER` |
| `InvalidAvatarUrlError` | `USER_INVALID_AVATAR_URL` |
| `InvalidAddressError` | `USER_INVALID_ADDRESS` |
| `AddressNotFoundError` | `USER_ADDRESS_NOT_FOUND` |

### User Domain Events

| Event | Trigger |
|---|---|
| `UserProfileCreatedEvent` | `User.create()` |
| `UserProfileUpdatedEvent` | `User.updateProfile()` |
| `AvatarUpdatedEvent` | `User.updateAvatarUrl()` |
| `AddressAddedEvent` | `User.addAddress()` |
| `AddressUpdatedEvent` | `User.updateAddress()` |
| `AddressRemovedEvent` | `User.removeAddress()` |
| `DefaultAddressChangedEvent` | `User.setDefaultAddress()` |

### Entities: User & Address

#### Address (child entity)

**File:** `entity/address.entity.ts`

`Address` is a **non-aggregate child entity** inside the User aggregate. All mutations must go through `User`.

**Key behaviors:**
- `Address.create(params)` — defaults `country` to `"Indonesia"`, first address auto-defaults
- `address.update(params)` — partial update of any field
- `address.markAsDefault()` / `address.unmarkAsDefault()` — called by `User` aggregate

**Props:** `label`, `recipient`, `phone`, `street`, `city`, `province`, `postalCode`, `country`, `latitude`, `longitude`, `isDefault`, `createdAt`, `updatedAt`

#### User (aggregate root)

**File:** `entity/user.entity.ts`

```typescript
interface UserProps {
  accountId: string;      // FK reference to Account BC (string — not a typed VO)
  name: Name;
  gender: Gender | null;
  dateOfBirth: Date | null;
  phoneNumber: PhoneNumber | null;
  avatarUrl: AvatarUrl | null;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

**Factory Methods:**

| Method | Description |
|---|---|
| `User.create(params)` | New profile — emits `UserProfileCreatedEvent` |
| `User.reconstruct(props, id)` | Hydrate from persistence — no events |

**Business Methods:**

| Method | Notes |
|---|---|
| `updateProfile(params)` | Partial update (only provided fields change) |
| `updateAvatarUrl(url \| null)` | Null removes the avatar |
| `addAddress(params)` | Auto-defaults if first address or `isDefault: true` |
| `updateAddress(id, params)` | Throws `AddressNotFoundError` if ID missing |
| `removeAddress(id)` | Promotes first remaining address as default if needed |
| `setDefaultAddress(id)` | Clears all defaults then sets the target |
| `softDelete()` | Sets `deletedAt`; idempotent |

**Computed Properties:**
```typescript
get defaultAddress(): Address | null
get isDeleted(): boolean
```

**Domain Invariants:**
1. At most one address with `isDefault = true`
2. If addresses exist, exactly one must be the default
3. `accountId` must not be empty

### User Repository Interfaces

#### `IUserRepository` (command side)

Token: `USER_REPOSITORY_TOKEN`

```typescript
findById(id: UserId): Promise<User | null>
findByAccountId(accountId: string): Promise<User | null>
save(user: User): Promise<void>
delete(id: UserId): Promise<void>
```

#### `IUserQueryRepository` (query side)

Token: `USER_QUERY_REPOSITORY_TOKEN`

```typescript
findById(id: string): Promise<UserProfileResult | null>
findByAccountId(accountId: string): Promise<UserProfileResult | null>
findAll(query: FindAllUsersQuery): Promise<FindAllUsersResult>
```

Returns plain DTOs: `UserProfileResult` (with nested `AddressResult[]`), `UserListItemResult`, `FindAllUsersResult`.

---

## Design Decisions

### 1. `accountId` as plain `string` in User props

Cross-BC references use primitive strings, not typed VOs, to avoid coupling between bounded contexts. The `accountId` field references the Account aggregate root ID but is treated as an opaque string inside the User BC.

### 2. Auth-provider enum values are UPPERCASE

Changed from `'google'` to `'GOOGLE'` etc. to match Prisma's `AuthProviderName` enum exactly. This eliminates the need for value mapping in the infrastructure layer.

### 3. `Password.validateRaw()` is separate from `Password.fromHash()`

Raw password validation (strength rules) is separated from the VO constructor. The VO only wraps the already-hashed value. This means:
- Use cases call `Password.validateRaw(rawPassword)` before hashing
- Hashing happens in the application/infrastructure layer (bcrypt)
- The domain VO stores only the hash

### 4. No `VerificationToken` or `RefreshToken` in the Account aggregate

Both are persistence-only constructs managed via their own repositories in the infrastructure layer. The Account aggregate cares about its state (`emailVerified`, `status`) but not the token lifecycle itself.

### 5. Domain guards vs. exception throwing in business methods

Business methods throw exceptions both internally AND via `assertCan*()` guards. Use-cases should call guards before invoking methods for early, descriptive error messages. The redundant checks inside methods protect domain invariants regardless of call site.

---

## Next Steps

### Infrastructure Layer

- [ ] **Prisma mappers** — Map between Prisma model types and domain entities/VOs:
  - `AccountMapper` (`src/modules/account/infrastructure/persistence/prisma/mappers/account.mapper.ts`)
  - `UserMapper` (`src/modules/user/infrastructure/persistence/prisma/mappers/user.mapper.ts`)
  - `AddressMapper`

- [ ] **Prisma repository implementations** — Implement `IAccountRepository`, `IAccountQueryRepository`, `IUserRepository`, `IUserQueryRepository` using the Prisma client.

- [ ] **Transaction support** — Integrate `PrismaUnitOfWork` so that creating an `Account` + `User` in the register use-case is atomic.

### Application Layer

- [ ] **Register use-case** (`register.usecase.ts`)
  - Validate password strength with `Password.validateRaw()`
  - Hash password (bcrypt)
  - `Account.create()`, persist via `IAccountRepository`
  - `User.create()`, persist via `IUserRepository`
  - Send verification email event listener

- [ ] **Login use-case** (`login-with-email.usecase.ts`)
  - Load account via `IAccountRepository`
  - `account.assertCanLogin()`
  - Verify bcrypt hash
  - `account.recordSuccessfulLogin()` or `account.recordFailedLoginAttempt()`
  - Issue JWT access token + refresh token

- [ ] **Verify email use-case** (`verify-email.usecase.ts`)
  - Validate `VerificationToken` hash
  - `account.verifyEmail()`

- [ ] **Forgot / Reset password use-cases**

- [ ] **Change password use-case**

- [ ] **OAuth Google callback use-case** (`google-auth-callback.usecase.ts`)
  - `Account.createFromOAuth()` or `account.linkProvider()` for returning users

- [ ] **Refresh token use-case** (`refresh-token.usecase.ts`)

- [ ] **Logout use-case** (`logout.usecase.ts`)
  - Revoke refresh token record

- [ ] **User profile management use-cases** — update profile, upload avatar, manage addresses

### Presentation Layer

- [ ] **HTTP controllers** — Map DTOs to/from use-case params; apply guards and pipes

- [ ] **Guards** — `JwtAuthGuard`, `RolesGuard`, `EmailVerifiedGuard`

- [ ] **Swagger decorators** — Document all endpoints

### Event Handlers

- [ ] **`UserRegisteredEvent` handler** — Create `VerificationToken`, send verification email via `MailService`
- [ ] **`PasswordResetEvent` handler** — Send password-reset confirmation email
- [ ] **`UserLoggedInEvent` handler** — Persist `LoginHistory` record
- [ ] **`UserCreatedFromOAuthEvent` handler** — Create `User` profile after OAuth registration
- [ ] **`EmailVerifiedEvent` handler** — Optional: send welcome email

### Security Considerations

- [ ] Encrypt `twoFactorSecret` at the application layer (AES-256-GCM) before persisting
- [ ] Use `argon2` or `bcrypt` for hashing backup codes
- [ ] Store only `SHA-256(token)` in `VerificationToken.tokenHash` and `RefreshToken.tokenHash`
- [ ] Rate-limit sensitive endpoints (already stubbed in `rate-limit.config.ts`)
