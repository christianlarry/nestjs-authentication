# System Design — NestJS Authentication Service

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Bounded Contexts](#2-bounded-contexts)
3. [Technology Stack](#3-technology-stack)
4. [Infrastructure Components](#4-infrastructure-components)
5. [Data Model](#5-data-model)
6. [Security Architecture](#6-security-architecture)
7. [Token Lifecycle](#7-token-lifecycle)
8. [Module Structure](#8-module-structure)
9. [Request Flow](#9-request-flow)
10. [Background Jobs](#10-background-jobs)
11. [Configuration & Environment](#11-configuration--environment)

---

## 1. Architecture Overview

This service is built following **Clean Architecture** layered on top of **Domain-Driven Design (DDD)** tactical patterns. The dependency rule is strictly enforced: inner layers have zero knowledge of outer layers.

```
┌────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│         (HTTP Controllers, DTOs, Swagger)              │
├────────────────────────────────────────────────────────┤
│                   Application Layer                     │
│       (Use Cases / Interactors, CQRS Commands)         │
├────────────────────────────────────────────────────────┤
│                     Domain Layer                        │
│   (Aggregate Roots, Entities, VOs, Domain Events,      │
│    Domain Errors, Repository Interfaces)               │
├────────────────────────────────────────────────────────┤
│                 Infrastructure Layer                    │
│  (Prisma Repositories, Strategies, Token Validation,   │
│   Mail Queue, Redis, Config)                           │
└────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|---|---|---|
| **Domain** | `src/modules/*/domain/` | Business rules, invariants, domain events |
| **Application** | `src/modules/*/application/` | Orchestrates use cases, coordinates domain + infrastructure |
| **Infrastructure** | `src/modules/*/infrastructure/` | Persistence, external services, Passport strategies |
| **Presentation** | `src/modules/*/presentation/` | HTTP controllers, DTOs, request/response shaping |
| **Core** | `src/core/` | Shared abstractions: base classes, interfaces, cross-cutting modules |

---

## 2. Bounded Contexts

The system is split into two bounded contexts, each with its own module, domain model, and repository interfaces.

### 2.1 Account Bounded Context

**Module:** `src/modules/account/`

Owns everything related to **authentication credentials and security state**.

```
Account (Aggregate Root)
├── email: Email (VO)
├── password: Password (VO — Argon2 hash)
├── status: AccountStatus (ACTIVE | INACTIVE | PENDING_VERIFICATION | SUSPENDED | DELETED)
├── role: Role (USER | ADMIN)
├── loginAttempts: number
├── lockedUntil: Date | null
├── twoFactorEnabled: boolean
├── twoFactorSecret: string | null (TOTP encrypted at rest)
├── twoFactorBackupCodes: string[] (hashed)
└── providers: AuthProviderVO[] (linked OAuth providers)
```

**Domain Invariants enforced by the aggregate:**
- An account with `DELETED` status must have `deletedAt` set
- An account with `emailVerified = true` must have `emailVerifiedAt` set
- An account with `twoFactorEnabled = true` must have `twoFactorSecret` set
- `loginAttempts` resets on every successful authentication
- After 5 consecutive failed attempts within the lockout window, `lockedUntil` is set to `now + 30 minutes`
- OAuth-only accounts have no password (`password = null`)

**Key Domain Events emitted by the Account aggregate:**
- `AccountCreatedEvent` — after successful registration
- `AccountEmailVerifiedEvent` — after email verification
- `AccountLoggedInEvent` — on every successful login
- `AccountLoginFailedEvent` — on every failed login attempt
- `AccountLockedEvent` — when lockout threshold is reached
- `AccountPasswordChangedEvent` — after change-password
- `AccountPasswordResetEvent` — after reset-password flow
- `AccountProviderLinkedEvent` / `AccountProviderUnlinkedEvent`
- `AccountTwoFactorEnabledEvent` / `AccountTwoFactorDisabledEvent`
- `AccountDeactivatedEvent` / `AccountReactivatedEvent` / `AccountSuspendedEvent` / `AccountDeletedEvent`

**Repository Interfaces:**
- `IAccountRepository` (command) — `ACCOUNT_REPOSITORY_TOKEN`
- `IAccountQueryRepository` (query) — `ACCOUNT_QUERY_REPOSITORY_TOKEN`

---

### 2.2 User Bounded Context

**Module:** `src/modules/user/`

Owns **profile and personal data**, always linked 1:1 with an Account.

```
User (Aggregate Root)
├── accountId: string (foreign reference — no direct navigation)
├── name: Name (VO)
├── gender: Gender | null (MALE | FEMALE)
├── dateOfBirth: Date | null
├── phoneNumber: PhoneNumber | null (VO)
├── avatarUrl: AvatarUrl | null (VO)
└── addresses: Address[] (child entities)

Address (Child Entity)
├── label: string
├── recipient: string
├── phone: string
├── street, city, province, postalCode, country
├── latitude / longitude (optional)
└── isDefault: boolean
```

**Domain Invariants:**
- A user may have at most **one default address**
- If any addresses exist, exactly one must be marked as default
- `accountId` must be non-empty (validates on construction)

**Key Domain Events:**
- `UserProfileCreatedEvent` / `UserProfileUpdatedEvent`
- `UserAvatarUpdatedEvent`
- `UserAddressAddedEvent` / `UserAddressUpdatedEvent` / `UserAddressRemovedEvent`
- `UserDefaultAddressChangedEvent`

---

## 3. Technology Stack

| Category | Technology | Notes |
|---|---|---|
| **Runtime** | Node.js + TypeScript | ES2023 target, `nodenext` module resolution |
| **Framework** | NestJS 11 | Modular, DI-first |
| **HTTP Adapter** | **Fastify** (active) | Replaces default Express; ~2× throughput |
| **ORM** | **Prisma** | Client generated at `src/core/infrastructure/persistence/prisma/generated/client` |
| **Database** | PostgreSQL | Primary persistent store |
| **Cache / Session** | Redis (ioredis) | Token blacklist, rate-limit counters, OAuth state |
| **Queue** | BullMQ (Redis-backed) | Async email job dispatch |
| **Auth** | Passport.js + `@nestjs/jwt` | JWT access/refresh, OAuth2 strategies |
| **Password hashing** | **Argon2** | Memory-hard; preferred over bcrypt |
| **2FA** | TOTP (RFC 6238) | Compatible with Google Authenticator, Authy |
| **Rate limiting** | `@nestjs/throttler` + Redis | Per-endpoint limits with Redis storage |
| **Validation** | `class-validator` + `class-transformer` | Whitelist, transform, forbidNonWhitelisted |
| **API docs** | Swagger (OpenAPI 3) | Available at `/docs` |
| **Mail** | Nodemailer via `@nestjs-modules/mailer` | Handlebars templates |
| **Config** | `@nestjs/config` + `class-validator` | Typed + validated env vars |

### Fastify Plugins Registered
- `@fastify/helmet` — secure HTTP headers
- `@fastify/compress` — Brotli/gzip response compression
- `@fastify/cookie` — cookie parsing (refresh token delivery)

---

## 4. Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet / Client                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────────┐
│                   NestJS (Fastify) App                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Auth Module  │  │AuthGoogle Mod│  │   Account / User Mod  │ │
│  │  (JWT strat) │  │(OAuth2 strat)│  │   (CQRS Use Cases)    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                 │                       │              │
│  ┌──────▼───────────────────────────────────────▼────────────┐  │
│  │                 Core Infrastructure                        │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │   Prisma   │  │  Redis Mod   │  │   Mail Module    │  │  │
│  │  │  Service   │  │  (ioredis)   │  │  (BullMQ Queue)  │  │  │
│  │  └─────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │  │
│  └────────┼────────────────┼─────────────────────┼───────────┘  │
└───────────┼────────────────┼─────────────────────┼─────────────┘
            │                │                      │
    ┌───────▼─────┐  ┌───────▼──────┐   ┌──────────▼──────┐
    │ PostgreSQL  │  │    Redis     │   │  SMTP Server    │
    │   (data)    │  │(sessions,    │   │  (email send)   │
    │             │  │ rate-limits, │   └─────────────────┘
    └─────────────┘  │ token store) │
                     └──────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **PostgreSQL** | All persistent domain data: accounts, users, addresses, refresh tokens, verification tokens, login history, OAuth providers |
| **Redis** | Rate-limit counters (ThrottlerStorageRedis), token blacklist (revoked access tokens), OAuth2 `state` param storage |
| **BullMQ** | Decouples mail sending from HTTP request path; retries on SMTP failure |
| **SMTP** | Transactional email: email verification, password reset, new-login notification |

---

## 5. Data Model

### Entity Relationship Overview

```
Account 1───* AuthProvider
Account 1───* RefreshToken
Account 1───* VerificationToken
Account 1───* LoginHistory
Account 1───1 User
User    1───* Address
```

### Tables

#### `accounts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | VARCHAR(255) UNIQUE | |
| `emailVerified` | BOOLEAN | default false |
| `emailVerifiedAt` | TIMESTAMP | null until verified |
| `password` | VARCHAR(255) | Argon2 hash; null for OAuth-only |
| `lastPasswordChangedAt` | TIMESTAMP | |
| `role` | Enum(USER, ADMIN) | default USER |
| `status` | Enum(AccountStatus) | default PENDING_VERIFICATION |
| `loginAttempts` | INT | reset on successful login |
| `lockedUntil` | TIMESTAMP | null when not locked |
| `lastLoginAt` | TIMESTAMP | |
| `twoFactorEnabled` | BOOLEAN | default false |
| `twoFactorSecret` | VARCHAR(255) | TOTP secret (encrypted at app layer) |
| `twoFactorBackupCodes` | STRING[] | Argon2-hashed backup codes |
| `createdAt` / `updatedAt` / `deletedAt` | TIMESTAMP | soft-delete via `deletedAt` |

#### `auth_providers`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `accountId` | UUID FK → accounts | |
| `provider` | Enum(GOOGLE, FACEBOOK, GITHUB) | |
| `providerId` | VARCHAR(255) | provider-issued user ID |
| `accessToken` | TEXT | encrypted at app layer |
| `refreshToken` | TEXT | encrypted at app layer |
| `tokenExpiresAt` | TIMESTAMP | |
| `scope` | VARCHAR(500) | space-separated OAuth scopes |

Unique constraint: `(provider, providerId)`

#### `refresh_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `accountId` | UUID FK | |
| `tokenHash` | VARCHAR(255) UNIQUE | **SHA-256 hash** of issued JWT — raw token never stored |
| `ipAddress` | VARCHAR(45) | supports IPv6 |
| `userAgent` | VARCHAR(512) | |
| `deviceId` | VARCHAR(255) | optional stable device fingerprint |
| `expiresAt` | TIMESTAMP | |
| `revokedAt` | TIMESTAMP | null = active |

#### `verification_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `accountId` | UUID FK | |
| `type` | Enum(EMAIL_VERIFICATION, PASSWORD_RESET, ACCOUNT_REACTIVATION) | |
| `tokenHash` | VARCHAR(255) UNIQUE | **SHA-256 hash** — raw token sent via email |
| `expiresAt` | TIMESTAMP | |
| `usedAt` | TIMESTAMP | null = unused |

#### `login_histories` (immutable audit log)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `accountId` | UUID FK | |
| `ipAddress` | VARCHAR(45) | |
| `userAgent` | VARCHAR(512) | |
| `location` | VARCHAR(255) | geo-derived, e.g. "Jakarta, ID" |
| `success` | BOOLEAN | |
| `failReason` | VARCHAR(255) | INVALID_PASSWORD, ACCOUNT_LOCKED, etc. |
| `createdAt` | TIMESTAMP | |

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `accountId` | UUID UNIQUE FK → accounts | 1:1 |
| `name` | VARCHAR(255) | |
| `gender` | Enum(MALE, FEMALE) | nullable |
| `dateOfBirth` | TIMESTAMP | nullable |
| `phoneNumber` | VARCHAR(50) | nullable |
| `avatarUrl` | VARCHAR(1000) | nullable |

#### `addresses`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `userId` | UUID FK → users | |
| `label` | VARCHAR(255) | e.g. "Home", "Office" |
| `recipient` | VARCHAR(255) | |
| `phone` | VARCHAR(50) | |
| `street`, `city`, `province`, `postalCode` | VARCHAR | |
| `country` | VARCHAR(100) | default "Indonesia" |
| `latitude` / `longitude` | DECIMAL(10,7) | optional coordinates |
| `isDefault` | BOOLEAN | exactly one per user |

---

## 6. Security Architecture

### 6.1 Authentication Flow (High Level)

```
Client → POST /v1/auth/login
          ↓
     Rate Limit Check (Redis ThrottlerGuard)
          ↓
     Load Account by email (DB)
          ↓
     account.assertCanLogin() — checks status, lockout
          ↓
     Argon2.verify(plainPassword, account.passwordHash)
          ↓
     account.recordSuccessfulLogin()  OR  account.recordFailedLoginAttempt()
          ↓ (success)
     Issue JWT access token  +  Issue JWT refresh token
          ↓
     SHA-256(refreshToken) → store in refresh_tokens table
          ↓
     Return: { access_token }  +  Set-Cookie: refresh_token (httpOnly)
```

### 6.2 JWT Strategy

| Token | Algorithm | Expiry | Storage (client) | Stored (server) |
|---|---|---|---|---|
| **Access Token** | HS256 | 15 minutes | Memory / Authorization header | Not stored (stateless); revoked tokens added to Redis blacklist |
| **Refresh Token** | HS256 | 30 days | httpOnly cookie | `SHA-256(token)` in `refresh_tokens` table |

**Access token claims:**
```json
{
  "sub": "<account-uuid>",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### 6.3 Password Security

- **Algorithm:** Argon2id (memory-hard, resistant to GPU attacks)
- **Validation:** minimum 8 characters, at least one uppercase, one lowercase, one digit, one special character
- **Change password:** requires current password. OAuth-only accounts cannot use this endpoint.
- **Reset password flow:** sends a SHA-256-hashed token via email; raw token is single-use, expiry 1 hour.

### 6.4 Account Lockout

| Threshold | Lockout Duration | Reset Condition |
|---|---|---|
| 5 failed login attempts | 30 minutes | Successful login OR manual unlock (admin) |

The domain method `recordFailedLoginAttempt()` sets `lockedUntil = now() + 30min` when `loginAttempts >= 5`. The guard `assertCanLogin()` throws `AccountLockedError` if `lockedUntil > now()`.

### 6.5 Two-Factor Authentication (TOTP)

- Standard TOTP (RFC 6238) compatible with authenticator apps
- `twoFactorSecret` is **encrypted** at the application layer before storing in PostgreSQL
- Backup codes are **Argon2-hashed** individually; provided once during 2FA setup
- Login with 2FA enabled: verify password → verify TOTP → issue tokens

### 6.6 Rate Limiting

Rate limits are enforced globally and per-endpoint using `@nestjs/throttler` with Redis-backed storage.

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/register` | 5 req | 1 hour |
| `POST /auth/login` | 10 req | 15 minutes |
| `POST /auth/forgot-password` | 3 req | 1 hour |
| `POST /auth/resend-verification` | 3 req | 1 hour |
| `POST /auth/refresh` | 20 req | 15 minutes |
| `GET /auth/google/callback` | 10 req | 1 minute |
| Global default | 100 req | 1 minute |

### 6.7 Token Hashing

**Never store raw tokens.** All sensitive tokens follow this pattern:

1. Generate a cryptographically random token (e.g. 32 bytes via `crypto.randomBytes`)
2. Send the **raw** token to the user (in email body or cookie)
3. Store only `SHA-256(rawToken)` in the database
4. On verification: re-compute `SHA-256(incomingToken)` and look up by hash

This ensures that even if the database is compromised, an attacker cannot use leaked token hashes.

### 6.8 OAuth2 Security

- **State parameter:** A cryptographically random `state` value is generated per OAuth initiation, stored in Redis with a short TTL, and validated on callback to prevent CSRF attacks.
- **OAuth tokens:** Provider `accessToken` and `refreshToken` are **encrypted** at the application layer before being stored in the `auth_providers` table.

---

## 7. Token Lifecycle

```
[Registration]
  → email sent with raw verificationToken
  → DB stores SHA-256(verificationToken), type=EMAIL_VERIFICATION, expires 24h

[Verify Email]
  → re-compute SHA-256 → lookup → mark usedAt → Account.verifyEmail()

[Login]
  → issue accessToken (15min) + refreshToken (30d)
  → store SHA-256(refreshToken) in refresh_tokens

[Authenticated Request]
  → Bearer accessToken in Authorization header
  → JWT strategy validates signature + expiry
  → Check Redis blacklist (revoked tokens)

[Refresh Token Rotation]
  → httpOnly cookie → re-compute SHA-256 → lookup in DB
  → verify not expired/revoked
  → revoke old refresh token (revokedAt = now())
  → issue new accessToken + new refreshToken
  → store new SHA-256(refreshToken)

[Logout]
  → revoke refresh token in DB
  → add accessToken jti/hash to Redis blacklist (until its natural expiry)
  → clear refresh_token cookie

[Forgot Password]
  → email sent with raw resetToken
  → DB stores SHA-256(resetToken), type=PASSWORD_RESET, expires 1h

[Reset Password]
  → re-compute SHA-256 → lookup → Account.resetPassword() → mark usedAt
  → revoke all existing refresh tokens for account
```

---

## 8. Module Structure

```
src/
├── main.ts                          # Bootstrap: Fastify, Swagger, ValidationPipe, CORS
├── app.module.ts                    # Root module: registers all feature + core modules
│
├── core/                            # Cross-cutting, framework-agnostic concerns
│   ├── application/
│   │   ├── application-error.base.ts
│   │   ├── application-event.base.ts
│   │   └── unit-of-work.interface.ts
│   ├── config/
│   │   ├── app/                     # App config (port, env, cors, cookie secret)
│   │   └── rate-limit/              # TTL and request limit
│   ├── domain/
│   │   ├── aggregate-root.base.ts   # Base class with domain event support
│   │   ├── domain-error.base.ts
│   │   ├── domain-event.base.ts
│   │   └── unique-identifier.base.ts
│   └── infrastructure/
│       ├── mailer/                  # Nodemailer module
│       ├── persistence/
│       │   ├── prisma/              # PrismaService, UnitOfWork, CLS, generated client
│       │   └── redis/               # RedisModule (ioredis)
│       └── services/
│           └── mail/                # MailModule: BullMQ processor + service + templates
│
└── modules/
    ├── account/                     # Account Bounded Context
    │   ├── account.module.ts
    │   └── domain/
    │       ├── entity/              # Account aggregate root
    │       ├── enums/               # AccountStatus, Role, AuthProvider
    │       ├── errors/              # 20 typed domain errors
    │       ├── events/              # 15 domain events
    │       ├── repositories/        # IAccountRepository, IAccountQueryRepository
    │       └── value-objects/       # Email, Password, Name, AccountId, AuthProviderVO
    │
    ├── user/                        # User Bounded Context
    │   ├── user.module.ts
    │   └── domain/
    │       ├── entity/              # User aggregate root + Address child entity
    │       ├── enums/               # Gender
    │       ├── errors/              # 6 typed domain errors
    │       ├── events/              # 7 domain events
    │       ├── repositories/        # IUserRepository, IUserQueryRepository
    │       └── value-objects/       # UserId, AddressId, Name, PhoneNumber, AvatarUrl
    │
    ├── auth/                        # Auth Bounded Context
    │   ├── auth.module.ts
    │   └── application/
    │       └── use-cases/           # 10 use-case files (implementation pending)
    │   └── infrastructure/
    │       ├── config/              # Auth token config (secrets, expiry)
    │       ├── repositories/        # RefreshToken + VerificationToken repos
    │       ├── strategies/          # Passport: JWT, JWT-refresh strategies
    │       └── token-validation/    # Access token blacklist checker
    │   └── presentation/
    │       └── http/                # Auth controller, DTOs, guards
    │
    └── auth-google/                 # Google OAuth2 Bounded Context
        ├── auth-google.module.ts
        └── application/             # Google OAuth use case
        └── infrastructure/
            └── config/              # Google OAuth config (clientID, secret, callbackURL)
        └── presentation/            # Google OAuth controller
```

---

## 9. Request Flow

### Authenticated Request (JWT Guard)

```
HTTP Request
    │
    ▼
ThrottlerGuard (Redis rate limit check)
    │
    ▼
JwtAuthGuard (Passport JWT strategy)
    ├─ Extract Bearer token from Authorization header
    ├─ Verify JWT signature + expiry
    ├─ Check Redis blacklist (revoked tokens)
    └─ Inject account payload into request
    │
    ▼
RolesGuard (if @Roles() decorator present)
    │
    ▼
ValidationPipe (DTO validation via class-validator)
    │
    ▼
Controller → Use Case → Domain → Repository → Database
    │
    ▼
Response
```

### OAuth2 Login Request

```
GET /v1/auth/google
    │
    ▼
GoogleAuthGuard (Passport OAuth2 strategy)
    ├─ Generate state (random bytes → store in Redis with TTL)
    └─ Redirect to Google OAuth consent page

GET /v1/auth/google/callback?code=...&state=...
    │
    ▼
GoogleAuthGuard
    ├─ Validate state from Redis (CSRF check)
    ├─ Exchange code for tokens with Google
    └─ Fetch user profile
    │
    ▼
GoogleAuthCallbackUseCase
    ├─ Find or create Account by (GoogleID)
    ├─ Issue JWT access + refresh tokens
    └─ Store SHA-256(refreshToken)
    │
    ▼
Redirect to frontend with tokens
```

---

## 10. Background Jobs

Mail jobs are dispatched via BullMQ to decouple transactional email from the HTTP request path.

| Job Name | Trigger | Template |
|---|---|---|
| `send-verification-email` | AccountCreatedEvent handler | `verification.hbs` |
| `send-password-reset-email` | ForgotPasswordRequested handler | `password-reset.hbs` |
| `send-password-changed-email` | AccountPasswordChangedEvent handler | `password-changed.hbs` |
| `send-new-login-notification` | AccountLoggedInEvent handler (new device) | `new-login.hbs` |
| `send-account-locked-email` | AccountLockedEvent handler | `account-locked.hbs` |

The `MailProcessor` class (BullMQ worker) processes jobs, retrying on SMTP failure with exponential backoff.

---

## 11. Configuration & Environment

All configuration is loaded via `@nestjs/config` and validated with `class-validator` at startup. If any required variable is missing or invalid, the application refuses to start.

### Environment Variables

```dotenv
# Application
NODE_ENV=development         # development | production | test
APP_PORT=3000
APP_NAME="NestJS Authentication"
APP_FRONTEND_URL=http://localhost:3001
APP_CORS_ORIGIN=http://localhost:3001
APP_COOKIE_SECRET=<32-byte-random>

# Database (Prisma)
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT - Access Token
AUTH_ACCESS_TOKEN_SECRET=<strong-random>
AUTH_ACCESS_TOKEN_EXPIRATION_MINUTES=15

# JWT - Refresh Token
AUTH_REFRESH_TOKEN_SECRET=<strong-random>
AUTH_REFRESH_TOKEN_EXPIRATION_DAYS=30

# JWT - Verification Token
AUTH_VERIFICATION_TOKEN_SECRET=<strong-random>
AUTH_VERIFICATION_TOKEN_EXPIRATION_HOURS=24

# JWT - Forgot Password Token
AUTH_FORGOT_PASSWORD_TOKEN_SECRET=<strong-random>
AUTH_FORGOT_PASSWORD_TOKEN_EXPIRATION_HOURS=1

# Mail (SMTP)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=noreply@example.com
MAIL_PASSWORD=<smtp-password>
MAIL_FROM="NestJS Auth" <noreply@example.com>

# Google OAuth2
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/v1/auth/google/callback

# Rate Limiting
RATE_LIMIT_TTL=60000          # milliseconds
RATE_LIMIT_LIMIT=100          # requests per TTL window
```

### Config Modules

| Config Class | Token | Loaded From |
|---|---|---|
| `AppConfig` | `app` | `APP_*` env vars |
| `AuthConfig` | `auth` | `AUTH_*` env vars |
| `AuthGoogleConfig` | `auth_google` | `GOOGLE_*` env vars |
| `RateLimitConfig` | `rate_limit` | `RATE_LIMIT_*` env vars |

All configs are aggregated into `AllConfigType` and accessed via `ConfigService<AllConfigType>`.
