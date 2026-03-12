# NestJS Authentication Service

A production-oriented authentication service built with NestJS 11, following **Clean Architecture** and **Domain-Driven Design (DDD)** principles. Provides email/password registration, email verification, social login (OAuth2), JWT access + refresh tokens, two-factor authentication (TOTP), account lockout, rate limiting, and asynchronous email delivery via a mail queue.

---

## Features

- Email/password registration with email verification
- Login with account lockout (5 failed attempts → 30 min lockout)
- JWT access tokens (15 min) + refresh tokens (30 days) with rotation
- Refresh token stored as SHA-256 hash — raw token delivered via httpOnly cookie
- Logout with token revocation and Redis blacklist
- Forgot password / reset password via one-time secure token (1 hour)
- Change password (authenticated)
- OAuth2 social login: **Google**, **GitHub**, **Facebook**
- Link and unlink OAuth providers to an existing account
- Two-factor authentication (TOTP, RFC 6238) with encrypted secret and hashed backup codes
- Account lifecycle management: activate, deactivate, suspend, soft-delete, reactivate
- Asynchronous email delivery via BullMQ (verification, reset, new-login notification, lockout notification)
- Rate limiting per endpoint using Redis-backed `@nestjs/throttler`
- Swagger/OpenAPI 3 documentation at `/docs`
- Full audit log of every login attempt (`LoginHistory`)

---

## Technology Stack

| Category | Technology |
|---|---|
| Framework | NestJS 11 |
| HTTP Adapter | **Fastify** (active — `@nestjs/platform-fastify`) |
| Language | TypeScript (ES2023, `nodenext` module resolution) |
| ORM | **Prisma** (client generated at `src/core/infrastructure/persistence/prisma/generated/client`) |
| Database | PostgreSQL |
| Cache / State | Redis (ioredis) — rate limiting, token blacklist, OAuth state |
| Job Queue | BullMQ (Redis-backed) |
| Authentication | Passport.js + `@nestjs/jwt` |
| Password hashing | **Argon2id** (memory-hard) |
| 2FA | TOTP (RFC 6238) |
| Validation | `class-validator` + `class-transformer` |
| API Docs | Swagger / OpenAPI 3 (`/docs`) |
| Mail | Nodemailer via `@nestjs-modules/mailer` (Handlebars templates) |

### Fastify Plugins Registered
- `@fastify/helmet` — secure HTTP headers
- `@fastify/compress` — Brotli/gzip compression
- `@fastify/cookie` — cookie parsing for refresh token delivery

---

## Architecture

The project follows **Clean Architecture** layered on **DDD** tactical patterns:

```
Presentation   →  Controllers, DTOs, Guards
Application    →  Use Cases (orchestration only)
Domain         →  Aggregates, Entities, Value Objects, Domain Events, Repository Interfaces
Infrastructure →  Prisma Repositories, Passport Strategies, Mail Queue, Redis, Config
```

**Bounded Contexts:**
- **Account BC** (`src/modules/account/`) — credentials, security state, lockout, 2FA, OAuth providers
- **User BC** (`src/modules/user/`) — profile data, addresses (1:1 with Account)

See [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) for full architecture details.

---

## Project Structure

```
src/
├── main.ts                          # Bootstrap: Fastify, Swagger, ValidationPipe, CORS
├── app.module.ts                    # Root module
│
├── core/                            # Shared abstractions
│   ├── config/                      # Typed, validated config modules
│   ├── domain/                      # Base classes: AggregateRoot, DomainEvent, etc.
│   └── infrastructure/
│       ├── persistence/
│       │   ├── prisma/              # PrismaService, UnitOfWork, generated client
│       │   └── redis/               # RedisModule (ioredis)
│       └── services/
│           └── mail/                # BullMQ mail processor + templates
│
└── modules/
    ├── account/                     # Account Bounded Context (domain complete)
    │   └── domain/
    │       ├── entity/              # Account aggregate root
    │       ├── enums/               # AccountStatus, Role, AuthProvider
    │       ├── errors/              # 20 typed domain errors
    │       ├── events/              # 15 domain events
    │       ├── repositories/        # IAccountRepository, IAccountQueryRepository
    │       └── value-objects/       # Email, Password, Name, AccountId, AuthProviderVO
    │
    ├── user/                        # User Bounded Context (domain complete)
    │   └── domain/
    │       ├── entity/              # User aggregate + Address child entity
    │       ├── enums/               # Gender
    │       ├── errors/              # 6 typed domain errors
    │       ├── events/              # 7 domain events
    │       ├── repositories/        # IUserRepository, IUserQueryRepository
    │       └── value-objects/       # UserId, AddressId, Name, PhoneNumber, AvatarUrl
    │
    ├── auth/                        # Auth module (use cases pending)
    │   └── application/use-cases/
    │   └── infrastructure/          # JWT config, strategies, token validation
    │   └── presentation/http/       # Controllers, DTOs
    │
    └── auth-google/                 # Google OAuth2 module
```

---

## Data Model Summary

```
Account ─────┬── AuthProvider  (linked OAuth providers)
             ├── RefreshToken   (hashed; per-session metadata)
             ├── VerificationToken (email verify, reset, reactivation)
             ├── LoginHistory   (immutable audit log)
             └── User
                  └── Address[]
```

See [docs/SYSTEM_DESIGN.md — Data Model](docs/SYSTEM_DESIGN.md#5-data-model) for full table schemas.

---

## Authentication Flows

See [docs/auth/AUTHENTICATION_FLOW.md](docs/auth/AUTHENTICATION_FLOW.md) for detailed sequence flows.

### Quick Overview

| Flow | Entry Point |
|---|---|
| Register | `POST /v1/auth/register` |
| Verify email | `POST /v1/auth/verify-email` |
| Login (email) | `POST /v1/auth/login` |
| Login (OAuth) | `GET /v1/auth/google` |
| Refresh token | `POST /v1/auth/refresh` (cookie) |
| Logout | `POST /v1/auth/logout` |
| Forgot password | `POST /v1/auth/forgot-password` |
| Reset password | `POST /v1/auth/reset-password` |
| Change password | `POST /v1/auth/change-password` |
| Enable 2FA | `POST /v1/auth/2fa/enable` |
| Verify 2FA | `POST /v1/auth/2fa/verify` |

---

## Token Lifecycle

| Token | Expiry | Client Storage | Server Storage |
|---|---|---|---|
| Access token | 15 minutes | Memory / Authorization header | Redis blacklist on logout |
| Refresh token | 30 days | httpOnly cookie | SHA-256(token) in `refresh_tokens` table |
| Email verification | 24 hours | Email link | SHA-256(token) in `verification_tokens` |
| Password reset | 1 hour | Email link | SHA-256(token) in `verification_tokens` |

---

## Security Highlights

| Feature | Detail |
|---|---|
| Password hashing | Argon2id |
| Account lockout | 5 failed attempts → 30 min lock |
| 2FA | TOTP (RFC 6238); encrypted secret at rest; hashed backup codes |
| Token hashing | SHA-256; raw token never persisted |
| Rate limiting | Redis-backed per-endpoint throttling |
| OAuth CSRF | Random `state` stored in Redis, validated on callback |
| Secure headers | `@fastify/helmet` |
| Token revocation | Refresh token: DB flag; Access token: Redis blacklist |

---

## Environment Variables

```dotenv
# Application
NODE_ENV=development
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

# JWT - Email Verification
AUTH_VERIFICATION_TOKEN_SECRET=<strong-random>
AUTH_VERIFICATION_TOKEN_EXPIRATION_HOURS=24

# JWT - Forgot Password
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
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for `docker-compose.yaml`)

### Install Dependencies

```bash
npm install
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Run the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

### API Documentation

Swagger UI is available at: `http://localhost:3000/docs`

---

## Running Tests

```bash
# Unit tests
npm run test

# Coverage
npm run test:cov

# Lint
npm run lint
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Full system design, architecture, data model, security |
| [docs/USE_CASES.md](docs/USE_CASES.md) | All 19 authentication use cases with flows and error specs |
| [docs/auth/AUTHENTICATION_FLOW.md](docs/auth/AUTHENTICATION_FLOW.md) | Detailed sequence diagrams for every auth flow |
| [docs/auth/AUTH_ENDPOINTS_SUMMARY.md](docs/auth/AUTH_ENDPOINTS_SUMMARY.md) | Quick-reference endpoint table |
| [docs/auth/OAUTH2_SETUP.md](docs/auth/OAUTH2_SETUP.md) | OAuth2 provider configuration guide |

---

## Implementation Status

| Layer | Status |
|---|---|
| Domain — Account BC | Complete |
| Domain — User BC | Complete |
| Infrastructure — Prisma repositories | Pending |
| Infrastructure — Passport strategies (JWT, OAuth) | Pending |
| Application — Use cases | Pending |
| Presentation — Controllers + DTOs | Pending |
| Mail templates | Pending |

