# Authentication Use Cases

## Overview

This document specifies all authentication use cases for the NestJS Authentication Service. Each use case follows the **Application Layer** pattern from Clean Architecture: it orchestrates domain objects, repositories, and infrastructure services without containing business logic itself.

Use cases are located in `src/modules/auth/application/use-cases/`.

---

## Use Case Index

| ID | Name | Endpoint |
|---|---|---|
| [UC-01](#uc-01-register-with-emailpassword) | Register with Email/Password | `POST /v1/auth/register` |
| [UC-02](#uc-02-verify-email) | Verify Email | `POST /v1/auth/verify-email` |
| [UC-03](#uc-03-resend-email-verification) | Resend Email Verification | `POST /v1/auth/resend-verification` |
| [UC-04](#uc-04-login-with-emailpassword) | Login with Email/Password | `POST /v1/auth/login` |
| [UC-05](#uc-05-oauth2-login--register) | OAuth2 Login / Register | `GET /v1/auth/:provider/callback` |
| [UC-06](#uc-06-refresh-access-token) | Refresh Access Token | `POST /v1/auth/refresh` |
| [UC-07](#uc-07-logout) | Logout | `POST /v1/auth/logout` |
| [UC-08](#uc-08-forgot-password) | Forgot Password | `POST /v1/auth/forgot-password` |
| [UC-09](#uc-09-reset-password) | Reset Password | `POST /v1/auth/reset-password` |
| [UC-10](#uc-10-change-password) | Change Password | `POST /v1/auth/change-password` |
| [UC-11](#uc-11-link-oauth-provider) | Link OAuth Provider | `GET /v1/auth/:provider` (authenticated) |
| [UC-12](#uc-12-unlink-oauth-provider) | Unlink OAuth Provider | `DELETE /v1/auth/providers/:provider` |
| [UC-13](#uc-13-link-local-credentials) | Link Local Credentials | `POST /v1/auth/link-local` |
| [UC-14](#uc-14-enable-two-factor-authentication) | Enable Two-Factor Authentication | `POST /v1/auth/2fa/enable` |
| [UC-15](#uc-15-confirm-two-factor-authentication-setup) | Confirm 2FA Setup | `POST /v1/auth/2fa/confirm` |
| [UC-16](#uc-16-verify-two-factor-authentication) | Verify Two-Factor Authentication | `POST /v1/auth/2fa/verify` |
| [UC-17](#uc-17-disable-two-factor-authentication) | Disable Two-Factor Authentication | `POST /v1/auth/2fa/disable` |
| [UC-18](#uc-18-request-account-reactivation) | Request Account Reactivation | `POST /v1/auth/reactivate` |
| [UC-19](#uc-19-confirm-account-reactivation) | Confirm Account Reactivation | `POST /v1/auth/reactivate/confirm` |

---

## UC-01: Register with Email/Password

**Actor:** Anonymous user  
**Trigger:** User submits registration form

### Preconditions
- No account with the submitted email exists

### Input
```typescript
{
  email: string;      // valid email, max 255 chars
  password: string;   // min 8 chars, 1 upper, 1 lower, 1 digit, 1 special
  name: string;       // 1–100 chars
}
```

### Main Flow
1. Validate input DTO (class-validator)
2. Check email uniqueness in `accounts` table → `409 EMAIL_ALREADY_EXISTS` if taken
3. Argon2id-hash the password
4. `Account.create({ email, passwordHash, name })` — domain factory
   - Sets `status = PENDING_VERIFICATION`, `role = USER`
5. Persist `Account` to DB
6. Generate `crypto.randomBytes(32)` → raw email verification token
7. Compute `SHA-256(rawToken)`; persist `VerificationToken` record with `type = EMAIL_VERIFICATION`, `expiresAt = now + 24h`
8. Dispatch BullMQ job: `send-verification-email` carrying raw token
9. Return `201`

### Alternate Flows
- **Duplicate email:** Skip steps 3–9; return `409`
- **Password fails policy:** Return `400` with validation details
- **Mail dispatch fails:** Use-case still succeeds (fire-and-forget job queue)

### Postconditions
- New `Account` record with `status = PENDING_VERIFICATION`
- `VerificationToken` record with `type = EMAIL_VERIFICATION`
- Verification email in mail queue

### Domain Events Emitted
- `AccountCreatedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid DTO |
| `EMAIL_ALREADY_EXISTS` | 409 | Duplicate email |

---

## UC-02: Verify Email

**Actor:** Anonymous user (from email link)  
**Trigger:** User clicks the verification link in the registration email

### Preconditions
- A `VerificationToken` of `type = EMAIL_VERIFICATION` exists for the submitted token
- The token has not expired and has not been used

### Input
```typescript
{
  token: string;   // raw token from email link
}
```

### Main Flow
1. Compute `SHA-256(rawToken)`
2. Lookup `VerificationToken` by `tokenHash` where `type = EMAIL_VERIFICATION`
3. Validate: not expired, `usedAt = null`
4. Load `Account` by `tokenHash.accountId`
5. `account.verifyEmail()` — sets `emailVerified = true`, `emailVerifiedAt = now()`, `status = ACTIVE`
6. Persist Account
7. Set `VerificationToken.usedAt = now()`
8. Return `200`

### Alternate Flows
- **Token not found:** `401 TOKEN_INVALID`
- **Token expired:** `401 TOKEN_EXPIRED`
- **Token already used:** `409 TOKEN_ALREADY_USED`
- **Account already verified:** Idempotent — return `200` without error

### Postconditions
- `Account.emailVerified = true`, `status = ACTIVE`
- `VerificationToken.usedAt` set

### Domain Events Emitted
- `AccountEmailVerifiedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 401 | Token not found |
| `TOKEN_EXPIRED` | 401 | Token past expiry |
| `TOKEN_ALREADY_USED` | 409 | Token already consumed |

---

## UC-03: Resend Email Verification

**Actor:** Anonymous user  
**Trigger:** User requests a new verification email

### Preconditions
- An `Account` with the given email exists
- `Account.status = PENDING_VERIFICATION`

### Input
```typescript
{
  email: string;
}
```

### Main Flow
1. Lookup `Account` by email
2. Validate `status = PENDING_VERIFICATION`
3. Invalidate any existing unused `VerificationToken` records for this account
4. Generate new raw token, compute SHA-256, persist new `VerificationToken`
5. Dispatch BullMQ job: `send-verification-email`
6. Return `200` (regardless of whether email exists — no enumeration)

### Rate Limiting
3 requests per hour per IP.

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `EMAIL_ALREADY_VERIFIED` | 409 | Account is already verified |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## UC-04: Login with Email/Password

**Actor:** Registered user  
**Trigger:** User submits the login form

### Preconditions
- An `Account` with the given email exists

### Input
```typescript
{
  email: string;
  password: string;
}
```

### Main Flow
1. Rate-limit check (Redis ThrottlerGuard)
2. Lookup `Account` by email; if not found → `401 INVALID_CREDENTIALS` (no email enumeration)
3. `account.assertCanLogin()` — checks status and lockout
4. `Argon2.verify(plainPassword, account.passwordHash)`
5. **If wrong password:**
   - `account.recordFailedLoginAttempt()` — increments attempts, sets lockout if >= 5
   - Write `LoginHistory(success=false)`
   - Return `401 INVALID_CREDENTIALS`
6. **If correct password:**
   - `account.recordSuccessfulLogin()` — resets attempts/lockout, updates `lastLoginAt`
   - Write `LoginHistory(success=true)`
   - **If 2FA enabled:** issue short-lived partial JWT → return `{ requiresTwoFactor: true, tempToken }`
   - **If 2FA not enabled:** issue `accessToken` + `refreshToken`
   - `SHA-256(refreshToken)` → persist `RefreshToken` record
   - Set httpOnly cookie: `refresh_token`
   - Return `200 { accessToken, expiresIn }`

### Alternate Flows
- **Account locked:** `assertCanLogin()` throws → `423 ACCOUNT_LOCKED`
- **Email not verified:** `assertCanLogin()` throws → `401 EMAIL_NOT_VERIFIED`
- **Account suspended/deleted/inactive:** `assertCanLogin()` throws → `403`

### Postconditions (success)
- `Account.lastLoginAt` updated, `loginAttempts = 0`
- `RefreshToken` record persisted
- `LoginHistory` record (immutable)

### Domain Events Emitted
- `AccountLoggedInEvent` (success)
- `AccountLoginFailedEvent` (failure)
- `AccountLockedEvent` (when lockout threshold reached)

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong password or email not found |
| `EMAIL_NOT_VERIFIED` | 401 | Account not yet verified |
| `ACCOUNT_SUSPENDED` | 403 | Admin-suspended |
| `ACCOUNT_DELETED` | 403 | Soft-deleted account |
| `ACCOUNT_INACTIVE` | 403 | Deactivated account |
| `ACCOUNT_LOCKED` | 423 | Locked after failed attempts |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

---

## UC-05: OAuth2 Login / Register

**Actor:** Anonymous user (or authenticated user linking a provider)  
**Trigger:** OAuth provider callback after user grants consent

### Providers
- Google (`auth-google` module)
- GitHub (`auth-github` module — pending)
- Facebook (`auth-facebook` module — pending)

### Preconditions
- Valid `state` parameter exists in Redis (CSRF guard)
- OAuth code exchange with provider succeeded

### Input (from Passport strategy)
```typescript
{
  providerId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
}
```

### Main Flow

#### New User (no account found by providerId)
1. `Account.createFromOAuth({ email, name, provider, providerId })`
   - `status = ACTIVE` (email pre-verified by provider)
   - `emailVerified = true`
2. Persist Account
3. Link provider: create `AuthProvider` record (with encrypted tokens)
4. Create `User` profile (name, avatarUrl)
5. Issue `accessToken` + `refreshToken`
6. `SHA-256(refreshToken)` → persist `RefreshToken`
7. Redirect to frontend with tokens

#### Returning User (account found by providerId)
1. Load Account
2. `account.recordSuccessfulOAuthLogin()`
3. Update `AuthProvider` record with latest OAuth tokens
4. Issue `accessToken` + `refreshToken`
5. Redirect to frontend

#### Account Merging (provider email matches existing local account)
1. Prompt user to authenticate with their local credentials to confirm ownership
2. Link provider to existing account (see UC-11)

### Postconditions
- `Account` exists and is `ACTIVE`
- `AuthProvider` record exists and is up to date
- New `RefreshToken` record

### Domain Events Emitted
- `AccountCreatedEvent` (new user)
- `AccountProviderLinkedEvent` (new user — provider linked)
- `AccountLoggedInEvent` (returning user)

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_STATE` | 400 | OAuth state mismatch (CSRF) |
| `OAUTH_EXCHANGE_FAILED` | 400 | Code exchange with provider failed |
| `EMAIL_LINKED_TO_OTHER_ACCOUNT` | 409 | Email exists under a different account |

---

## UC-06: Refresh Access Token

**Actor:** Authenticated user (expired access token)  
**Trigger:** Client sends refresh token cookie

### Preconditions
- A valid (non-expired, non-revoked) `RefreshToken` record exists matching the submitted token

### Input
- `refresh_token` cookie (httpOnly)

### Main Flow
1. JwtRefreshGuard: extract JWT from cookie, verify signature and expiry
2. Compute `SHA-256(rawToken)`, lookup `RefreshToken` record in DB
3. Validate: `revokedAt = null`, `expiresAt > now()`
4. **Detect reuse:** if `revokedAt` is set → revoke ALL refresh tokens for this account (breach signal)
5. Revoke old token: `revokedAt = now()`
6. Issue new `accessToken` + new `refreshToken`
7. `SHA-256(newRefreshToken)` → persist new `RefreshToken`
8. Set new httpOnly cookie
9. Return `200 { accessToken, expiresIn }`

### Postconditions
- Old `RefreshToken` revoked
- New `RefreshToken` persisted

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 401 | Token not found in DB |
| `TOKEN_EXPIRED` | 401 | Token past DB `expiresAt` |
| `TOKEN_REVOKED` | 401 | Token already revoked |

---

## UC-07: Logout

**Actor:** Authenticated user  
**Trigger:** User explicitly logs out

### Preconditions
- Valid access token in `Authorization` header
- Refresh token cookie present

### Input
- `Authorization: Bearer <accessToken>`
- `refresh_token` cookie

### Main Flow
1. JwtAuthGuard: validate access token
2. Compute `SHA-256(refresh_token cookie)`, lookup and revoke `RefreshToken` in DB
3. Add access token to Redis blacklist: `blacklist:<jti>` with TTL = remaining JWT lifetime
4. Clear `refresh_token` cookie (`Set-Cookie: refresh_token=; Max-Age=0`)
5. Return `200`

### Postconditions
- `RefreshToken.revokedAt` set
- Access token in Redis blacklist (until natural expiry)
- Cookie cleared

### Domain Events Emitted
- None (logout is infrastructure-level)

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `UNAUTHORIZED` | 401 | Invalid or expired access token |

---

## UC-08: Forgot Password

**Actor:** Anonymous user  
**Trigger:** User requests a password reset email

### Preconditions
- User has an account with a password (not OAuth-only)

### Input
```typescript
{
  email: string;
}
```

### Main Flow
1. Lookup `Account` by email
2. `account.assertCanForgotPassword()` — blocks OAuth-only, SUSPENDED, DELETED accounts
3. Generate `crypto.randomBytes(32)` → raw reset token
4. Compute `SHA-256(rawToken)`, persist `VerificationToken` with `type = PASSWORD_RESET`, `expiresAt = now + 1h`
5. Dispatch BullMQ job: `send-password-reset-email` with raw token in link
6. **Always return `200`** — never reveal whether email exists

### Rate Limiting
3 requests per hour per IP/email.

### Postconditions
- `VerificationToken` record with `type = PASSWORD_RESET`
- Reset email in queue

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

*(Account not found is silently swallowed to prevent enumeration)*

---

## UC-09: Reset Password

**Actor:** Anonymous user (from email link)  
**Trigger:** User submits the reset-password form with token from email

### Preconditions
- A `VerificationToken` of `type = PASSWORD_RESET` exists for the submitted token
- Token has not expired and has not been used
- Account is in a valid state for password reset

### Input
```typescript
{
  token: string;         // raw token from email
  newPassword: string;   // must pass password policy
}
```

### Main Flow
1. Compute `SHA-256(token)`, lookup `VerificationToken` by hash
2. Validate: not expired, `usedAt = null`, `type = PASSWORD_RESET`
3. Load `Account` by `token.accountId`
4. Validate `account.assertCanForgotPassword()`
5. Argon2id-hash `newPassword`
6. `account.resetPassword(newPasswordHash)` — updates hash, `lastPasswordChangedAt`
7. Set `VerificationToken.usedAt = now()`
8. Revoke ALL active `RefreshToken` records for this account
9. Persist Account
10. Dispatch email: `send-password-changed-email`
11. Return `200`

### Postconditions
- `Account.password` updated
- All active refresh tokens revoked (all sessions terminated)
- `VerificationToken.usedAt` set

### Domain Events Emitted
- `AccountPasswordResetEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 401 | Token not found |
| `TOKEN_EXPIRED` | 401 | Token past expiry |
| `TOKEN_ALREADY_USED` | 409 | Token already consumed |
| `VALIDATION_ERROR` | 400 | New password fails policy |

---

## UC-10: Change Password

**Actor:** Authenticated user  
**Trigger:** User submits change-password form from account settings

### Preconditions
- User is authenticated (valid JWT)
- Account has a password hash (not OAuth-only)

### Input
```typescript
{
  currentPassword: string;
  newPassword: string;    // must pass password policy
}
```

### Main Flow
1. JwtAuthGuard validates access token
2. Load `Account` by `sub` from JWT claims
3. `account.assertCanChangePassword()` — throws if account has no password
4. `Argon2.verify(currentPassword, account.passwordHash)` — mismatch → `400`
5. Argon2id-hash `newPassword`
6. `account.changePassword(newPasswordHash)`
7. Persist Account
8. Optionally: revoke other active `RefreshToken` sessions (keep current alive)
9. Dispatch email: `send-password-changed-email`
10. Return `200`

### Postconditions
- `Account.password` updated
- Other refresh token sessions may be revoked

### Domain Events Emitted
- `AccountPasswordChangedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_CREDENTIALS` | 400 | Current password is wrong |
| `CANNOT_CHANGE_PASSWORD` | 403 | OAuth-only account (no password) |
| `VALIDATION_ERROR` | 400 | New password fails policy |

---

## UC-11: Link OAuth Provider

**Actor:** Authenticated user  
**Trigger:** Authenticated user initiates OAuth flow to link a provider

### Preconditions
- User is authenticated
- Provider is not already linked to this account

### Main Flow
1. Authenticated user initiates `GET /v1/auth/google` with JWT present
2. OAuth flow completes; callback received
3. Find account by (provider, providerId) — if found → `409 PROVIDER_ALREADY_LINKED`
4. Load account from JWT sub
5. `account.linkProvider(new AuthProviderVO(provider, providerId))`
6. Create `AuthProvider` record in DB (with encrypted tokens)
7. Persist Account
8. Return `200`

### Postconditions
- New `AuthProvider` record linked to Account

### Domain Events Emitted
- `AccountProviderLinkedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `PROVIDER_ALREADY_LINKED` | 409 | Provider already linked to an account |
| `EMAIL_LINKED_TO_OTHER_ACCOUNT` | 409 | OAuth email belongs to a different account |

---

## UC-12: Unlink OAuth Provider

**Actor:** Authenticated user  
**Trigger:** User removes a linked OAuth provider from account settings

### Preconditions
- User is authenticated
- Provider is linked to this account
- At least one auth method remains after unlinking (password OR another provider)

### Input
- Route param: `provider` (`google` | `github` | `facebook`)

### Main Flow
1. JwtAuthGuard validates token
2. Load Account
3. Validate: account has at least one other auth method
4. `account.unlinkProvider(AuthProvider.<PROVIDER>)`
5. Delete `AuthProvider` record
6. Persist Account
7. Return `200`

### Postconditions
- `AuthProvider` record deleted

### Domain Events Emitted
- `AccountProviderUnlinkedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `PROVIDER_NOT_LINKED` | 404 | Provider not linked to this account |
| `CANNOT_UNLINK_LAST_AUTH_METHOD` | 400 | No other auth method remains |

---

## UC-13: Link Local Credentials

**Actor:** Authenticated OAuth-only user  
**Trigger:** User adds a password to their OAuth-only account

### Preconditions
- User is authenticated
- Account has no password (OAuth-only)

### Input
```typescript
{
  password: string;   // must pass password policy
}
```

### Main Flow
1. JwtAuthGuard validates token
2. Load Account
3. Validate: `account.password = null`
4. Argon2id-hash password
5. `account.changePassword(hash)` — sets password for the first time
6. Persist Account
7. Return `200`

### Postconditions
- `Account.password` set (account now has both local + OAuth auth)

### Domain Events Emitted
- `AccountPasswordChangedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `PASSWORD_ALREADY_SET` | 409 | Account already has a password |
| `VALIDATION_ERROR` | 400 | Password fails policy |

---

## UC-14: Enable Two-Factor Authentication

**Actor:** Authenticated user  
**Trigger:** User navigates to security settings and enables 2FA

### Preconditions
- User is authenticated
- `account.twoFactorEnabled = false`

### Main Flow
1. JwtAuthGuard validates token
2. Load Account, validate `twoFactorEnabled = false`
3. Generate TOTP secret using RFC 6238-compliant algorithm
4. Encrypt secret at application layer
5. Generate QR code URI: `otpauth://totp/<issuer>:<email>?secret=<base32>&issuer=<issuer>`
6. Generate 8 backup codes (`crypto.randomBytes(4).toString('hex')` each)
7. Argon2-hash each backup code
8. Store encrypted secret and hashed backup codes temporarily (not yet committed to 2FA enabled)
9. Return `{ qrCodeUri, backupCodes }` — **backup codes shown only once**

### Postconditions
- TOTP secret stored (encrypted), 2FA pending confirmation
- Backup codes stored (hashed), shown once

### Note
2FA is not active until UC-15 (confirm) is completed.

---

## UC-15: Confirm Two-Factor Authentication Setup

**Actor:** Authenticated user  
**Trigger:** User scans QR code and submits first TOTP code to confirm setup

### Preconditions
- User is authenticated
- UC-14 (enable 2FA) was completed but not yet confirmed

### Input
```typescript
{
  totpCode: string;   // 6-digit code from authenticator app
}
```

### Main Flow
1. JwtAuthGuard validates token
2. Load Account
3. Decrypt TOTP secret
4. Verify `totpCode` against secret (allow 30s window tolerance)
5. `account.enableTwoFactor(secret, hashedBackupCodes)`
6. Persist Account
7. Return `200 { message: "2FA enabled successfully" }`

### Postconditions
- `account.twoFactorEnabled = true`
- `account.twoFactorSecret` set (encrypted)
- `account.twoFactorBackupCodes` set (hashed)

### Domain Events Emitted
- `AccountTwoFactorEnabledEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_TOTP_CODE` | 400 | Wrong or expired TOTP code |

---

## UC-16: Verify Two-Factor Authentication

**Actor:** User completing 2FA login step  
**Trigger:** User submits TOTP code after password was verified (second factor)

### Preconditions
- User has a valid **partial JWT** (`twoFactorPending: true`) from UC-04 login step 1
- `account.twoFactorEnabled = true`

### Input
```typescript
{
  code: string;   // 6-digit TOTP code OR 8-char backup code
}
```

### Main Flow
1. Validate partial JWT (short-lived, `twoFactorPending: true`)
2. Load Account
3. If input matches backup code format:
   - Hash the input, compare against each stored hashed backup code
   - If match: remove that backup code (single-use)
4. Else: decrypt TOTP secret, verify TOTP code
5. Issue full `accessToken` + `refreshToken`
6. `SHA-256(refreshToken)` → persist `RefreshToken`
7. Set httpOnly cookie
8. Return `200 { accessToken, expiresIn }`

### Postconditions
- Full session established
- If backup code used: removed from list (single-use)

### Domain Events Emitted
- `AccountLoggedInEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_TOTP_CODE` | 400 | Wrong TOTP code or backup code |
| `TEMP_TOKEN_EXPIRED` | 401 | Partial JWT expired (5 min window) |

---

## UC-17: Disable Two-Factor Authentication

**Actor:** Authenticated user  
**Trigger:** User disables 2FA from security settings

### Preconditions
- User is authenticated
- `account.twoFactorEnabled = true`

### Input
```typescript
{
  totpCode: string;   // 6-digit TOTP code to confirm intent
}
```

### Main Flow
1. JwtAuthGuard validates token
2. Load Account, validate `twoFactorEnabled = true`
3. Decrypt TOTP secret
4. Verify `totpCode` against secret
5. `account.disableTwoFactor()` — clears `twoFactorSecret` and `twoFactorBackupCodes`
6. Persist Account
7. Return `200`

### Postconditions
- `account.twoFactorEnabled = false`
- `account.twoFactorSecret = null`
- `account.twoFactorBackupCodes = []`

### Domain Events Emitted
- `AccountTwoFactorDisabledEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `INVALID_TOTP_CODE` | 400 | Wrong TOTP code |
| `TWO_FACTOR_NOT_ENABLED` | 400 | 2FA was not enabled |

---

## UC-18: Request Account Reactivation

**Actor:** Anonymous user (previously deactivated)  
**Trigger:** User requests to reactivate their deactivated account

### Preconditions
- An `Account` with the given email exists
- `account.status = INACTIVE`

### Input
```typescript
{
  email: string;
}
```

### Main Flow
1. Lookup `Account` by email
2. Validate `status = INACTIVE`
3. Generate `crypto.randomBytes(32)` → raw reactivation token
4. Compute `SHA-256(rawToken)`, persist `VerificationToken` with `type = ACCOUNT_REACTIVATION`, expires 24h
5. Dispatch BullMQ job: `send-reactivation-email`
6. **Always return `200`** (no enumeration)

### Postconditions
- `VerificationToken` record with `type = ACCOUNT_REACTIVATION`

---

## UC-19: Confirm Account Reactivation

**Actor:** Anonymous user (from reactivation email link)  
**Trigger:** User clicks reactivation link

### Preconditions
- A valid `VerificationToken` of `type = ACCOUNT_REACTIVATION` exists
- `account.status = INACTIVE`

### Input
```typescript
{
  token: string;   // raw token from email
}
```

### Main Flow
1. Compute `SHA-256(token)`, lookup `VerificationToken`
2. Validate: not expired, `usedAt = null`, `type = ACCOUNT_REACTIVATION`
3. Load Account, validate `status = INACTIVE`
4. `account.activate()` — sets `status = ACTIVE`
5. Set `VerificationToken.usedAt = now()`
6. Persist Account
7. Return `200`

### Postconditions
- `account.status = ACTIVE`
- `VerificationToken.usedAt` set

### Domain Events Emitted
- `AccountReactivatedEvent`

### Errors
| Code | HTTP | Condition |
|---|---|---|
| `TOKEN_INVALID` | 401 | Token not found |
| `TOKEN_EXPIRED` | 401 | Token past expiry |
| `TOKEN_ALREADY_USED` | 409 | Token already consumed |
| `ACCOUNT_NOT_INACTIVE` | 400 | Account is not in INACTIVE state |
