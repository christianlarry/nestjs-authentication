# Authentication Flow — NestJS Authentication Service

## Table of Contents

1. [Registration & Email Verification](#1-registration--email-verification)
2. [Login with Email & Password](#2-login-with-email--password)
3. [Account Lockout](#3-account-lockout)
4. [Token Refresh](#4-token-refresh)
5. [Logout](#5-logout)
6. [Forgot Password / Reset Password](#6-forgot-password--reset-password)
7. [Change Password](#7-change-password)
8. [OAuth2 Login (Google / GitHub / Facebook)](#8-oauth2-login-google--github--facebook)
9. [OAuth Provider Linking & Unlinking](#9-oauth-provider-linking--unlinking)
10. [Two-Factor Authentication (TOTP)](#10-two-factor-authentication-totp)
11. [Account Reactivation](#11-account-reactivation)
12. [Token Security Model](#12-token-security-model)
13. [Rate Limiting Reference](#13-rate-limiting-reference)
14. [Domain Events & Audit Log](#14-domain-events--audit-log)
15. [Error Reference](#15-error-reference)

---

## 1. Registration & Email Verification

### 1.1 Registration Flow

```
Client                         Auth Controller          Domain (Account BC)      Infrastructure
  │                                  │                        │                       │
  │  POST /v1/auth/register          │                        │                       │
  │─────────────────────────────────>│                        │                       │
  │                                  │                        │                       │
  │                        Validate DTO (class-validator)     │                       │
  │                                  │                        │                       │
  │                            Check email exists?────────────────────────────>DB query
  │                                  │                        │               <───────│
  │                                  │                        │                       │
  │                            Account.create()───────────────>                       │
  │                                  │                  Argon2id hash password         │
  │                                  │                  Set status = PENDING_VERIFICATION
  │                                  │                  Emit AccountCreatedEvent       │
  │                                  │<──────────────────────│                       │
  │                                  │                        │                       │
  │                     Save Account to DB────────────────────────────────────>DB write
  │                                  │                        │                       │
  │                     Generate verificationToken (crypto.randomBytes(32))           │
  │                     SHA-256(token) → save VerificationToken record                │
  │                     type = EMAIL_VERIFICATION, expires = now + 24h                │
  │                                  │                        │                       │
  │                     Dispatch BullMQ job: send-verification-email (raw token)      │
  │                                  │                        │                       │
  │  201 { message: "... check email" }                       │                       │
  │<─────────────────────────────────│                        │                       │
```

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Password policy:** minimum 8 characters, at least one uppercase letter, one lowercase letter, one digit, one special character.

**Domain invariants checked:** email must be unique, password must pass policy validation.

---

### 1.2 Email Verification Flow

```
Client                         Auth Controller          Domain (Account BC)
  │                                  │                        │
  │  POST /v1/auth/verify-email      │                        │
  │  { token: "<raw-token>" }        │                        │
  │─────────────────────────────────>│                        │
  │                                  │                        │
  │                     Compute SHA-256(rawToken)              │
  │                     Lookup VerificationToken by tokenHash │
  │                                  │                        │
  │                     [Not found]────────────────────────── 401 TOKEN_INVALID
  │                     [Expired] ────────────────────────── 401 TOKEN_EXPIRED
  │                     [Already used]─────────────────────── 409 TOKEN_ALREADY_USED
  │                                  │                        │
  │                     Load Account ──────────────────────── DB
  │                     account.verifyEmail()─────────────────>
  │                                  │              Set emailVerified = true
  │                                  │              Set emailVerifiedAt = now()
  │                                  │              Set status = ACTIVE
  │                                  │              Emit AccountEmailVerifiedEvent
  │                                  │<──────────────────────│
  │                                  │                        │
  │                     Mark token usedAt = now()              │
  │                     Save Account                          │
  │                                  │                        │
  │  200 { message: "Email verified" }                        │
  │<─────────────────────────────────│                        │
```

---

### 1.3 Resend Verification Email

- Only allowed for accounts with `status = PENDING_VERIFICATION`
- Previous unused tokens for the same account are invalidated
- New token generated, hashed, stored; raw token dispatched via BullMQ
- Rate limited: 3 requests per hour

---

## 2. Login with Email & Password

```
Client                         Auth Controller           Domain (Account BC)
  │                                  │                        │
  │  POST /v1/auth/login             │                        │
  │  { email, password }             │                        │
  │─────────────────────────────────>│                        │
  │                                  │                        │
  │                     Rate-limit check (Redis ThrottlerGuard)
  │                     Load Account by email (not found → 401)
  │                                  │                        │
  │                     account.assertCanLogin()──────────────>
  │                                  │              Check status:
  │                                  │              - PENDING_VERIFICATION → 401 EMAIL_NOT_VERIFIED
  │                                  │              - SUSPENDED → 403 ACCOUNT_SUSPENDED
  │                                  │              - DELETED  → 403 ACCOUNT_DELETED
  │                                  │              - INACTIVE → 403 ACCOUNT_INACTIVE
  │                                  │              Check lockedUntil > now() → 423 ACCOUNT_LOCKED
  │                                  │<──────────────────────│
  │                                  │                        │
  │                     Argon2.verify(plainPassword, account.passwordHash)
  │                                  │                        │
  │                     [wrong password]                       │
  │                     account.recordFailedLoginAttempt()────>
  │                                  │              loginAttempts += 1
  │                                  │              if loginAttempts >= 5:
  │                                  │                lockedUntil = now + 30min
  │                                  │                Emit AccountLockedEvent
  │                                  │              Emit AccountLoginFailedEvent
  │                                  │<──────────────────────│
  │                     Save Account                          │
  │                     Write LoginHistory (success=false)     │
  │  401 INVALID_CREDENTIALS         │                        │
  │<─────────────────────────────────│                        │
  │                                  │                        │
  │                     [correct password]                     │
  │                     account.recordSuccessfulLogin()────────>
  │                                  │              loginAttempts = 0
  │                                  │              lockedUntil = null
  │                                  │              lastLoginAt = now()
  │                                  │              Emit AccountLoggedInEvent
  │                                  │<──────────────────────│
  │                     Save Account                          │
  │                     Write LoginHistory (success=true)      │
  │                                  │                        │
  │                     [2FA enabled?]                         │
  │                     YES → issue partial JWT (twoFactorPending=true)
  │                           → 200 { requiresTwoFactor: true, tempToken }
  │                     NO  → Issue accessToken + refreshToken
  │                           SHA-256(refreshToken) → refresh_tokens table
  │                           Set-Cookie: refresh_token (httpOnly)
  │  200 { accessToken, expiresIn }   │                        │
  │<─────────────────────────────────│                        │
```

### Access Token Claims
```json
{
  "sub": "<account-uuid>",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1700000000,
  "exp": 1700000900
}
```

---

## 3. Account Lockout

The lockout mechanism is implemented entirely in the **Account aggregate** (domain layer).

| Condition | Action |
|---|---|
| Wrong password submitted | `account.recordFailedLoginAttempt()` increments `loginAttempts` |
| `loginAttempts >= 5` | `lockedUntil = new Date(now + 30 * 60 * 1000)` |
| `lockedUntil > now()` | `assertCanLogin()` throws `AccountLockedError` → HTTP 423 |
| Successful login | `recordSuccessfulLogin()` resets `loginAttempts = 0`, `lockedUntil = null` |

**Auto-unlock:** The lock expires naturally when `now() > lockedUntil`. No cron job needed.

**Admin unlock:** An admin endpoint can call `account.activate()` and persist it to unlock ahead of schedule.

**Email notification:** `AccountLockedEvent` triggers a BullMQ job to send a lock notification email.

---

## 4. Token Refresh

Refresh tokens use **rotation**: every successful refresh revokes the old token and issues a new pair.

```
Client                         Auth Controller           Infrastructure
  │                                  │                        │
  │  POST /v1/auth/refresh           │                        │
  │  Cookie: refresh_token=<jwt>     │                        │
  │─────────────────────────────────>│                        │
  │                                  │                        │
  │                     JwtRefreshGuard extracts token from cookie
  │                     Verify JWT signature & expiry          │
  │                     Compute SHA-256(rawToken)              │
  │                     Lookup RefreshToken by tokenHash ─────>DB
  │                                  │                  <─────│
  │                     [Not found / revoked / expired] → 401 │
  │                                  │                        │
  │                     Revoke old token: revokedAt = now()    │
  │                     Issue new accessToken                  │
  │                     Issue new refreshToken                 │
  │                     SHA-256(newRefreshToken) → DB          │
  │                     Set-Cookie: refresh_token=<new-jwt> (httpOnly)
  │  200 { accessToken, expiresIn }   │                        │
  │<─────────────────────────────────│                        │
```

**Reuse detection:** If a revoked refresh token is presented, all refresh tokens for that account are revoked (potential token theft).

---

## 5. Logout

```
Client                         Auth Controller           Infrastructure
  │                                  │                        │
  │  POST /v1/auth/logout            │                        │
  │  Authorization: Bearer <jwt>     │                        │
  │  Cookie: refresh_token=<jwt>     │                        │
  │─────────────────────────────────>│                        │
  │                                  │                        │
  │                     JwtAuthGuard validates access token    │
  │                     Compute SHA-256(refreshToken from cookie)
  │                     Lookup + revoke RefreshToken in DB ───>DB
  │                     Add access token to Redis blacklist    │
  │                       key: "blacklist:<jti>"               │
  │                       TTL: remaining access token TTL      │
  │                     Clear Set-Cookie: refresh_token=""     │
  │  200 { message: "Logout successful" }                      │
  │<─────────────────────────────────│                        │
```

---

## 6. Forgot Password / Reset Password

### 6.1 Forgot Password

```
POST /v1/auth/forgot-password
{ email: "user@example.com" }
```

**Flow:**
1. Look up account by email
2. `account.assertCanForgotPassword()` — blocks DELETED/SUSPENDED/OAuth-only accounts
3. Generate `crypto.randomBytes(32)` → raw token
4. Compute `SHA-256(rawToken)` → save as `VerificationToken` with `type = PASSWORD_RESET`, expires 1 hour
5. Dispatch BullMQ job: `send-password-reset-email` with the **raw** token in the link
6. **Always return `200`** regardless of whether the email exists (prevents email enumeration)

---

### 6.2 Reset Password

```
POST /v1/auth/reset-password
{ token: "<raw-token-from-email>", newPassword: "NewPass123!" }
```

**Flow:**
1. Compute `SHA-256(rawToken)`
2. Lookup `VerificationToken` by hash where `type = PASSWORD_RESET`
3. Validate: not expired, not already used, account is in a valid state
4. `account.resetPassword(newPasswordHash)` — Argon2id hashes the new password, sets `lastPasswordChangedAt`
5. Mark token `usedAt = now()`
6. **Revoke all active refresh tokens** for this account (all sessions)
7. Emit `AccountPasswordResetEvent`

---

## 7. Change Password

For authenticated users who know their current password. **Not available for OAuth-only accounts.**

```
POST /v1/auth/change-password
Authorization: Bearer <access_token>
{ currentPassword: "OldPass123!", newPassword: "NewPass123!" }
```

**Flow:**
1. JwtAuthGuard — extract account ID from JWT
2. Load account from DB
3. `account.assertCanChangePassword()` — blocks accounts without a password hash
4. `Argon2.verify(currentPassword, account.passwordHash)` — mismatch → 400
5. `account.changePassword(newPasswordHash)` — updates hash, emits `AccountPasswordChangedEvent`
6. Optionally revoke other active refresh token sessions (keep current session alive)
7. Dispatch notification email: `send-password-changed-email`

---

## 8. OAuth2 Login (Google / GitHub / Facebook)

### 8.1 OAuth2 Initiation

```
GET /v1/auth/google     (Google)
GET /v1/auth/github     (GitHub)
GET /v1/auth/facebook   (Facebook)
```

1. Generate cryptographically random `state` value (`crypto.randomBytes(16).toString('hex')`)
2. Store `state` in Redis with TTL 5 minutes: `oauth:state:<state> = 1`
3. Redirect to provider's OAuth consent page with the `state` parameter

---

### 8.2 OAuth2 Callback

```
GET /v1/auth/google/callback?code=...&state=...
GET /v1/auth/github/callback?code=...&state=...
GET /v1/auth/facebook/callback?code=...&state=...
```

```
Provider              Passport Strategy              Use Case              Domain
   │                        │                           │                    │
   │  callback?code&state   │                           │                    │
   │───────────────────────>│                           │                    │
   │                        │                           │                    │
   │                Validate state from Redis (CSRF check)                   │
   │                [state not found → 400 INVALID_STATE]                   │
   │                Delete state from Redis                                  │
   │                        │                           │                    │
   │                Exchange code for tokens with provider                   │
   │                Fetch user profile from provider                         │
   │                        │                           │                    │
   │                        │  { providerId, email, name, avatar }           │
   │                        │──────────────────────────>│                    │
   │                        │                           │                    │
   │                        │               Find account by (provider, providerId)
   │                        │                           │                    │
   │                        │            [New user — no account found]       │
   │                        │               Account.createFromOAuth()────────>
   │                        │               status = ACTIVE (pre-verified)   │
   │                        │               emailVerified = true              │
   │                        │               Create User profile               │
   │                        │               Link provider                    │
   │                        │               Emit AccountCreatedEvent         │
   │                        │               Emit AccountProviderLinkedEvent  │
   │                        │                           │<───────────────────│
   │                        │            [Returning user]                    │
   │                        │               account.recordSuccessfulOAuthLogin()
   │                        │               Update OAuth tokens in AuthProvider table
   │                        │                           │                    │
   │                Issue accessToken + refreshToken    │                    │
   │                SHA-256(refreshToken) → DB                               │
   │                                                                         │
   │  Redirect to frontend with tokens (query params or secure fragment)     │
```

**Account merging:** If the provider email matches an existing local account, the OAuth provider is **linked** to that existing account instead of creating a duplicate.

---

## 9. OAuth Provider Linking & Unlinking

### 9.1 Link OAuth Provider to Existing Account

Used when a user with a local (email/password) account wants to add Google/GitHub/Facebook login.

```
1. User authenticates (JWT)
2. GET /v1/auth/google  (with JWT present)
3. Google callback → GoogleCallbackUseCase
4. Account found by (provider, providerId) → already linked? → 409
5. Account loaded from JWT sub → account.linkProvider(providerVO)
6. Save AuthProvider record in DB
7. Emit AccountProviderLinkedEvent
```

### 9.2 Unlink OAuth Provider

```
DELETE /v1/auth/providers/google
Authorization: Bearer <access_token>
```

**Flow:**
1. Load account
2. Validate: at least one auth method remains after unlinking (cannot unlink last provider if no password set)
3. `account.unlinkProvider(AuthProvider.GOOGLE)`
4. Delete `AuthProvider` record from DB
5. Emit `AccountProviderUnlinkedEvent`

### 9.3 Add Password to OAuth-only Account

Used when a user registered via OAuth and wants to set a password.

```
POST /v1/auth/link-local
Authorization: Bearer <access_token>
{ password: "NewPass123!" }
```

**Flow:**
1. Load account
2. Verify account has no password yet
3. `account.changePassword(newHash)` — sets password for the first time
4. Emit `AccountPasswordChangedEvent`

---

## 10. Two-Factor Authentication (TOTP)

### 10.1 Enable 2FA

```
POST /v1/auth/2fa/enable
Authorization: Bearer <access_token>
```

**Flow:**
1. Load account, verify `twoFactorEnabled = false`
2. Generate TOTP secret
3. Encrypt secret at app layer before storing temporarily
4. Generate QR code URI (`otpauth://totp/...`)
5. Generate 8 backup codes (`crypto.randomBytes(4).toString('hex')` each)
6. Argon2-hash each backup code before storing
7. Return: `{ qrCodeUri, backupCodes }` — **backup codes shown once only**
8. **2FA is not active yet** — must confirm

### 10.2 Confirm 2FA Setup

```
POST /v1/auth/2fa/confirm
Authorization: Bearer <access_token>
{ totpCode: "123456" }
```

**Flow:**
1. Verify TOTP code against stored (encrypted) secret
2. `account.enableTwoFactor(secret, backupCodes)`
3. `twoFactorEnabled = true`
4. Emit `AccountTwoFactorEnabledEvent`

### 10.3 2FA Login Flow

```
Step 1: POST /v1/auth/login  (email + password)
→ Password valid, 2FA enabled
→ Issue short-lived partial JWT (twoFactorPending: true, exp: 5min)
→ 200 { requiresTwoFactor: true, tempToken }

Step 2: POST /v1/auth/2fa/verify
Authorization: Bearer <partial-jwt>
{ code: "123456" }   ← TOTP code or single-use backup code

→ Verify TOTP against decrypted secret
   OR: hash(code) → compare against stored hashed backup codes
→ If backup code: remove it from list (single-use)
→ Issue full accessToken + refreshToken
→ 200 { accessToken, expiresIn }
```

### 10.4 Disable 2FA

```
POST /v1/auth/2fa/disable
Authorization: Bearer <access_token>
{ totpCode: "123456" }
```

**Flow:**
1. Verify TOTP code
2. `account.disableTwoFactor()` — clears `twoFactorSecret` and `twoFactorBackupCodes`
3. Emit `AccountTwoFactorDisabledEvent`

---

## 11. Account Reactivation

Accounts with `status = INACTIVE` can be reactivated by the user.

### 11.1 Request Reactivation

```
POST /v1/auth/reactivate
{ email: "user@example.com" }
```

**Flow:**
1. Find account by email
2. Validate `status = INACTIVE`
3. Generate token → `SHA-256(token)` → save as `VerificationToken`, `type = ACCOUNT_REACTIVATION`, expires 24h
4. Dispatch reactivation email
5. Return `200` regardless (no email enumeration)

### 11.2 Confirm Reactivation

```
POST /v1/auth/reactivate/confirm
{ token: "<raw-token>" }
```

**Flow:**
1. Compute `SHA-256(token)`, lookup in DB
2. Validate: not expired, not used, account is `INACTIVE`
3. `account.activate()` — sets `status = ACTIVE`
4. Mark token as used
5. Emit `AccountReactivatedEvent`

---

## 12. Token Security Model

### Token Storage Summary

| Token Type | Sent To Client As | Stored In DB As | Expiry |
|---|---|---|---|
| Access token | JWT in response body | Not stored; revoked tokens kept in Redis blacklist | 15 min |
| Refresh token | JWT in httpOnly cookie | `SHA-256(token)` in `refresh_tokens` | 30 days |
| Email verification token | Raw bytes in email link | `SHA-256(token)` in `verification_tokens` | 24 hours |
| Password reset token | Raw bytes in email link | `SHA-256(token)` in `verification_tokens` | 1 hour |
| Reactivation token | Raw bytes in email link | `SHA-256(token)` in `verification_tokens` | 24 hours |

### Why SHA-256 Hashing?

Storing raw tokens would allow a database attacker to use them immediately. Storing only the hash means:
- The raw token is a secret the server never persists
- Even if the DB is fully compromised, hashed tokens cannot be reversed
- This principle mirrors how passwords are stored with Argon2

### Access Token Revocation (Blacklist)

Access tokens are stateless JWTs. On logout:
- The token's `jti` (JWT ID claim) is stored in Redis: `blacklist:<jti>` with TTL = remaining token lifetime
- `JwtAuthGuard` checks the Redis blacklist on every authenticated request
- The blacklist entry is automatically cleaned up when the TTL expires

---

## 13. Rate Limiting Reference

| Endpoint | Max Requests | Window |
|---|---|---|
| `POST /auth/register` | 5 | 1 hour |
| `POST /auth/login` | 10 | 15 minutes |
| `POST /auth/forgot-password` | 3 | 1 hour |
| `POST /auth/resend-verification` | 3 | 1 hour |
| `POST /auth/refresh` | 20 | 15 minutes |
| `GET /auth/*/callback` | 10 | 1 minute |
| Global default | 100 | 1 minute |

**Response on rate limit:** `429 Too Many Requests`, header `Retry-After: <seconds>`

---

## 14. Domain Events & Audit Log

### Account Domain Events

| Event | Trigger | Side Effects |
|---|---|---|
| `AccountCreatedEvent` | `Account.create()` / `createFromOAuth()` | Send verification email (local accounts) |
| `AccountEmailVerifiedEvent` | `account.verifyEmail()` | Status set to ACTIVE |
| `AccountLoggedInEvent` | `account.recordSuccessfulLogin()` | Write LoginHistory (success) |
| `AccountLoginFailedEvent` | `account.recordFailedLoginAttempt()` | Write LoginHistory (failure) |
| `AccountLockedEvent` | Failed attempts >= 5 | Send lock notification email |
| `AccountPasswordChangedEvent` | `account.changePassword()` | Send password-changed email |
| `AccountPasswordResetEvent` | `account.resetPassword()` | Revoke all refresh tokens |
| `AccountProviderLinkedEvent` | `account.linkProvider()` | — |
| `AccountProviderUnlinkedEvent` | `account.unlinkProvider()` | — |
| `AccountTwoFactorEnabledEvent` | `account.enableTwoFactor()` | — |
| `AccountTwoFactorDisabledEvent` | `account.disableTwoFactor()` | — |
| `AccountDeactivatedEvent` | `account.deactivate()` | Revoke all sessions |
| `AccountReactivatedEvent` | `account.activate()` | — |
| `AccountSuspendedEvent` | `account.suspend()` | Send suspension email |
| `AccountDeletedEvent` | `account.softDelete()` | Revoke all sessions |

### LoginHistory Record

```typescript
{
  accountId: string;
  ipAddress: string | null;       // IPv4 or IPv6
  userAgent: string | null;
  location: string | null;        // Geo-derived, e.g. "Jakarta, ID"
  success: boolean;
  failReason: string | null;      // "INVALID_PASSWORD" | "ACCOUNT_LOCKED" | ...
  createdAt: Date;                // immutable
}
```

Every login attempt is recorded immutably. This enables:
- "New login from unrecognized device" notifications
- Suspicious activity detection
- Security audit trails

---

## 15. Error Reference

| HTTP Status | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 400 | `INVALID_PASSWORD_CHANGE` | Incorrect current password |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `EMAIL_NOT_VERIFIED` | Account in PENDING_VERIFICATION state |
| 401 | `TOKEN_INVALID` | Malformed, tampered, or not-found token |
| 401 | `TOKEN_EXPIRED` | Token past expiry time |
| 401 | `TOKEN_ALREADY_USED` | Verification token already consumed |
| 403 | `ACCOUNT_SUSPENDED` | Suspended by admin |
| 403 | `ACCOUNT_DELETED` | Soft-deleted account |
| 403 | `ACCOUNT_INACTIVE` | Account in INACTIVE state |
| 403 | `CANNOT_CHANGE_PASSWORD` | OAuth-only account has no password |
| 403 | `CANNOT_FORGOT_PASSWORD` | OAuth-only account cannot reset password |
| 409 | `EMAIL_ALREADY_EXISTS` | Duplicate email on registration |
| 409 | `PROVIDER_ALREADY_LINKED` | OAuth provider already linked |
| 423 | `ACCOUNT_LOCKED` | Locked after 5 failed login attempts |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
