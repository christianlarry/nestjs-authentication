# Authentication Endpoints — Quick Reference

## Overview

Complete and secure authentication service with email verification, password management, OAuth2 social login, two-factor authentication (TOTP), and account management.

All endpoints are prefixed with `/v1` (URI versioning).  
API documentation is available at `/docs` (Swagger/OpenAPI 3).

---

## All Authentication Endpoints

### 1. Registration & Email Verification

| Method | Endpoint | Auth | Guard | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/v1/auth/register` | No | Rate limit (5/hr) | Register new account; sends verification email |
| `POST` | `/v1/auth/verify-email` | No | — | Verify email address with token from email |
| `POST` | `/v1/auth/resend-verification` | No | Rate limit (3/hr) | Resend email verification link |

### 2. Login & Session

| Method | Endpoint | Auth | Guard | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/v1/auth/login` | No | Rate limit (10/15min) | Login with email + password |
| `POST` | `/v1/auth/refresh` | No (cookie) | Rate limit (20/15min) | Rotate refresh token; issue new access token |
| `POST` | `/v1/auth/logout` | Yes (JWT) | — | Revoke refresh token + blacklist access token |

### 3. Password Management

| Method | Endpoint | Auth | Guard | Description |
|--------|----------|------|-------|-------------|
| `POST` | `/v1/auth/forgot-password` | No | Rate limit (3/hr) | Request password reset; sends email with reset token |
| `POST` | `/v1/auth/reset-password` | No | — | Reset password using token received via email |
| `POST` | `/v1/auth/change-password` | Yes (JWT) | — | Change password (requires current password); not available for OAuth-only accounts |

### 4. OAuth2 Social Login

| Method | Endpoint | Auth | Guard | Description |
|--------|----------|------|-------|-------------|
| `GET` | `/v1/auth/google` | No | Rate limit | Initiate Google OAuth2 login; redirects to Google consent |
| `GET` | `/v1/auth/google/callback` | No | Rate limit (10/min) | Google OAuth2 callback; creates or links account |
| `GET` | `/v1/auth/github` | No | Rate limit | Initiate GitHub OAuth2 login; redirects to GitHub consent |
| `GET` | `/v1/auth/github/callback` | No | Rate limit (10/min) | GitHub OAuth2 callback; creates or links account |
| `GET` | `/v1/auth/facebook` | No | Rate limit | Initiate Facebook OAuth2 login |
| `GET` | `/v1/auth/facebook/callback` | No | Rate limit (10/min) | Facebook OAuth2 callback |

### 5. OAuth Provider Linking

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/auth/link-local` | Yes (JWT) | Add email/password credentials to an OAuth-only account |
| `DELETE` | `/v1/auth/providers/:provider` | Yes (JWT) | Unlink an OAuth provider (Google/GitHub/Facebook) |

### 6. Two-Factor Authentication (TOTP)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/auth/2fa/enable` | Yes (JWT) | Generate TOTP secret + QR code URI; returns backup codes |
| `POST` | `/v1/auth/2fa/confirm` | Yes (JWT) | Confirm setup by verifying first TOTP code |
| `POST` | `/v1/auth/2fa/disable` | Yes (JWT) | Disable 2FA (requires current TOTP code or backup code) |
| `POST` | `/v1/auth/2fa/verify` | Yes (partial JWT) | Submit TOTP code to complete login when 2FA is enabled |

### 7. Account Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/auth/reactivate` | No | Request account reactivation token (for INACTIVE accounts) |
| `POST` | `/v1/auth/reactivate/confirm` | No | Confirm reactivation with token from email |

---

## Request / Response Examples

### Register New Account
```http
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```
```json
{
  "message": "Registration successful. Please check your email to verify your account."
}
```

---

### Verify Email
```http
POST /v1/auth/verify-email
Content-Type: application/json

{
  "token": "<raw-token-from-email>"
}
```
```json
{ "message": "Email verified successfully. You can now log in." }
```

---

### Login
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
```json
{
  "accessToken": "<jwt>",
  "expiresIn": 900
}
```
> Refresh token is set as an `httpOnly` cookie: `Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict`

---

### Refresh Token
```http
POST /v1/auth/refresh
Cookie: refresh_token=<jwt>
```
```json
{
  "accessToken": "<new-jwt>",
  "expiresIn": 900
}
```

---

### Logout
```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
Cookie: refresh_token=<jwt>
```
```json
{ "message": "Logout successful." }
```

---

### Forgot Password
```http
POST /v1/auth/forgot-password
Content-Type: application/json

{ "email": "user@example.com" }
```
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### Reset Password
```http
POST /v1/auth/reset-password
Content-Type: application/json

{
  "token": "<raw-token-from-email>",
  "newPassword": "NewSecurePass123!"
}
```
```json
{ "message": "Password reset successful. You can now log in with your new password." }
```

---

### Change Password
```http
POST /v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```
```json
{ "message": "Password changed successfully." }
```

---

## User Journey Flows

### Journey 1: Email Registration
```
POST /auth/register  →  email sent
POST /auth/verify-email (token)  →  email verified
POST /auth/login  →  access token + refresh cookie
  [use protected routes]
POST /auth/refresh  →  new access token (when expired)
POST /auth/logout  →  revoke tokens
```

### Journey 2: Forgot Password
```
POST /auth/forgot-password (email)  →  reset email sent
POST /auth/reset-password (token, newPassword)  →  password reset
POST /auth/login  →  login with new password
```

### Journey 3: OAuth2 Login (Google)
```
GET /auth/google  →  redirect to Google consent
[user approves]
GET /auth/google/callback?code=...&state=...  →  tokens issued
  access token in response body
  refresh token in httpOnly cookie
```

### Journey 4: Enable 2FA
```
POST /auth/2fa/enable  →  returns QR code URI + backup codes
  [user scans QR in authenticator app]
POST /auth/2fa/confirm (totpCode)  →  2FA activated
  [next login requires POST /auth/2fa/verify after password check]
```

---

## Security Overview

| Feature | Details |
|---|---|
| Password hashing | Argon2id (memory-hard) |
| Access token | JWT HS256, 15 min expiry |
| Refresh token | JWT HS256, 30 days, httpOnly cookie; stored as SHA-256 hash |
| Verification tokens | SHA-256 hash only stored; raw token sent via email; 24h expiry |
| Password reset tokens | SHA-256 hash only stored; 1h expiry |
| Account lockout | 5 failed attempts → 30 min lockout |
| 2FA | TOTP (RFC 6238), encrypted secret at rest, hashed backup codes |
| Rate limiting | Redis-backed per-endpoint throttling |
| OAuth CSRF | Random `state` param validated via Redis |

---

## Token Expiry Reference

| Token | Expiry |
|---|---|
| Access token | 15 minutes |
| Refresh token | 30 days |
| Email verification token | 24 hours |
| Password reset token | 1 hour |
| Account reactivation token | 24 hours |

---

## Common Error Responses

| Status | Code | Scenario |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid request fields |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `EMAIL_NOT_VERIFIED` | Account not yet verified |
| 401 | `TOKEN_EXPIRED` | JWT or verification token expired |
| 401 | `TOKEN_INVALID` | Malformed or revoked token |
| 403 | `ACCOUNT_SUSPENDED` | Account suspended by admin |
| 403 | `ACCOUNT_DELETED` | Account has been deleted |
| 409 | `EMAIL_ALREADY_EXISTS` | Registration with duplicate email |
| 423 | `ACCOUNT_LOCKED` | Locked after 5 failed login attempts |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## Related Documentation

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) — Detailed sequence flows and edge cases
- [OAUTH2_SETUP.md](./OAUTH2_SETUP.md) — OAuth2 provider configuration guide
- [../SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md) — Full system design and architecture
- [../USE_CASES.md](../USE_CASES.md) — Detailed use case specifications

---

**API Version:** 1.0.0
