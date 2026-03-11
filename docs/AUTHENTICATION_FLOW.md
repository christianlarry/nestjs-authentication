# 🔐 Authentication Flow Documentation

## Overview

Sistem autentikasi Keramik Store Platform mengimplementasikan berbagai metode autentikasi yang aman dan modern, termasuk:

- ✅ **Email/Password** dengan verifikasi email
- ✅ **OAuth2** (Google & Facebook)
- ✅ **Password Reset** flow yang aman
- ✅ **JWT Tokens** (Access + Refresh tokens)
- ✅ **Rate Limiting** untuk keamanan

---

## 📋 Table of Contents

1. [Email/Password Registration Flow](#1-emailpassword-registration-flow)
2. [Email Verification Flow](#2-email-verification-flow)
3. [Login Flow](#3-login-flow)
4. [Forgot Password Flow](#4-forgot-password-flow)
5. [Reset Password Flow](#5-reset-password-flow)
6. [Change Password Flow](#6-change-password-flow-authenticated)
7. [OAuth2 Flow (Google/Facebook)](#7-oauth2-flow-googlefacebook)
8. [Token Refresh Flow](#8-token-refresh-flow)
9. [Logout Flow](#9-logout-flow)
10. [Link Local Account Flow](#10-link-local-account-flow-oauth-users)
11. [Account Linking & Management](#11-account-linking--management)
12. [Error Handling & Edge Cases](#12-error-handling--edge-cases)
13. [Rate Limiting Configuration](#13-rate-limiting-configuration)
14. [Security Audit Logging](#14-security-audit-logging)
15. [Security Best Practices](#15-security-best-practices)

---

## 1. Email/Password Registration Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │ Backend │                │  Email   │
└────┬────┘                └────┬────┘                │ Service  │
     │                          │                     └────┬─────┘
     │ POST /auth/register      │                          │
     │ { email, password, name }│                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 1. Validate input        │
     │                          │ 2. Hash password         │
     │                          │ 3. Create user (unverified)
     │                          │ 4. Generate verification token
     │                          │                          │
     │                          │ Send verification email  │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 201 Created              │                          │
     │ { message, userId }      │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### API Endpoint

**POST** `/v1/auth/register`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

### Response (201 Created)

```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

### Backend Implementation Steps

1. **Validate input**
   - Email format validation
   - Password strength check (min 8 characters)
   - Check if email already exists

2. **Hash password**
   - Use bcrypt with salt rounds (12+)
   - Never store plain text passwords

3. **Create user record**
   - Set `emailVerified: false`
   - Set `provider: 'local'`
   - Generate unique userId

4. **Generate verification token**
   - Create JWT with short expiration (24 hours)
   - Include userId and email in payload

5. **Send verification email**
   - Email subject: "Verify your Keramik Store account"
   - Include verification link with token
   - Template: `https://keramik-store.com/verify-email?token=xyz`

---

## 2. Email Verification Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ User clicks link in email│
     │                          │
     │ POST /auth/verify-email  │
     │ { token }                │
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Verify token signature
     │                          │ 2. Check token expiration
     │                          │ 3. Extract userId from token
     │                          │ 4. Update user.emailVerified = true
     │                          │
     │ 200 OK                   │
     │ { message }              │
     │<─────────────────────────┤
     │                          │
     │ Redirect to /login       │
     │                          │
```

### API Endpoint

**POST** `/v1/auth/verify-email`

### Request Body

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)

```json
{
  "message": "Email verified successfully. You can now login."
}
```

### Backend Implementation Steps

1. **Verify token**
   - Validate JWT signature
   - Check expiration
   - Extract userId from payload

2. **✅ Graceful handling (RECOMMENDED)**
   - Check if user email is already verified
   - If yes, return success message: "Email is already verified. You can login now."
   - Prevents confusion for OAuth users who might click old verification links

3. **Update user**
   - Find user by userId
   - Set `emailVerified: true`
   - Set `emailVerifiedAt: new Date()`
   - Set `status: 'ACTIVE'`

4. **Return success**
   - Frontend redirects to login page

### Resend Verification Email

**POST** `/v1/auth/resend-verification`

```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent. Please check your inbox."
}
```

**Backend Implementation:**

1. **Find user by email**
   - Return 404 if not found

2. **✅ Check provider (CRITICAL)**
   - Verify `user.provider === 'local'`
   - Return 400 if OAuth user
   - Message: "This account uses {provider} login and doesn't require email verification."

3. **Check if already verified**
   - If `emailVerified === true`, return 400
   - Message: "Email is already verified"

4. **Generate and send new token**
   - Create new verification token
   - Send verification email

**Rate Limiting:** Max 3 requests per 1 hour per email

---

## 3. Login Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ POST /auth/login         │
     │ { email, password }      │
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Find user by email
     │                          │ 2. Check emailVerified = true
     │                          │ 3. Compare password hash
     │                          │ 4. Generate access token (15m)
     │                          │ 5. Generate refresh token (7d)
     │                          │ 6. Save refresh token to DB
     │                          │
     │ 200 OK                   │
     │ { accessToken,           │
     │   refreshToken,          │
     │   expiresIn,             │
     │   user }                 │
     │<─────────────────────────┤
     │                          │
     │ Store tokens in storage  │
     │                          │
```

### API Endpoint

**POST** `/v1/auth/login`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "provider": "local",
    "createdAt": "2025-12-30T10:00:00Z"
  }
}
```

### Response (401 Unauthorized) - Email Not Verified

```json
{
  "statusCode": 401,
  "message": "Please verify your email before logging in",
  "error": "Unauthorized"
}
```

### Backend Implementation Steps

1. **Find user**
   - Query by email
   - Return 401 if not found (don't reveal if email exists)

2. **Check email verification**
   - Ensure `emailVerified === true`
   - Return 401 with specific message if not verified
   - Ensure user status ACTIVE

3. **Verify password**
   - Use bcrypt to compare hashed password
   - Return 401 if password doesn't match

4. **Generate tokens**
   - **Access Token**: JWT with 15 minutes expiration
     ```javascript
     payload: {
       sub: userId,
       email: user.email,
       role: user.role,
       type: 'access'
     }
     ```
   - **Refresh Token**: JWT with 7 days expiration
     ```javascript
     payload: {
       sub: userId,
       type: 'refresh',
       jti: uniqueTokenId // for token revocation
     }
     ```

5. **Store refresh token**
   - Save to database with expiration date
   - Associate with userId for tracking

6. **Return response**
   - Include both tokens and user info

---

## 4. Forgot Password Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │ Backend │                │  Email   │
└────┬────┘                └────┬────┘                │ Service  │
     │                          │                     └────┬─────┘
     │ POST /auth/forgot-password│                         │
     │ { email }                │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 1. Find user by email    │
     │                          │ 2. Generate reset token (1h expiry)
     │                          │ 3. Store token hash in DB│
     │                          │                          │
     │                          │ Send reset email         │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 200 OK                   │                          │
     │ { message }              │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ User receives email with reset link                 │
     │                          │                          │
```

### API Endpoint

**POST** `/v1/auth/forgot-password`

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response (200 OK)

```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

> **Security Note:** Always return success response even if email doesn't exist to prevent email enumeration attacks.

### Backend Implementation Steps

1. **Find user**
   - Query by email
   - Return 401 if not found (don't reveal if email exists)

2. **✅ Check provider (CRITICAL)**
   - Verify `user.provider === 'local'`
   - Return 400 if OAuth user tries to reset password
   - Message: "This account uses {provider} login. Please use '{provider}' to sign in."

3. **Generate reset token**
   - Create JWT with 1 hour expiration
   - Include userId in payload
   - Generate unique token ID (jti)

4. **Store token**
   - Hash token and store in `passwordResetTokens` table
   - Include expiration timestamp
   - Invalidate previous reset tokens for this user

5. **Send email**
   - Email subject: "Reset your Keramik Store password"
   - Include reset link: `https://keramik-store.com/reset-password?token=xyz`
   - Template with instructions and expiration time

6. **Rate limiting**
   - Max 3 requests per email per 1 hour
   - Prevent abuse

### Error Response for OAuth Users

```json
{
  "statusCode": 400,
  "message": "This account uses google login. Please use 'google' to sign in.",
  "error": "Bad Request"
}
```

---

## 5. Reset Password Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ User clicks reset link   │
     │                          │
     │ POST /auth/reset-password│
     │ { token, newPassword }   │
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Verify token signature
     │                          │ 2. Check token in DB (not used)
     │                          │ 3. Check expiration (1 hour)
     │                          │ 4. Hash new password
     │                          │ 5. Update user password
     │                          │ 6. Mark token as used
     │                          │ 7. Invalidate all refresh tokens
     │                          │
     │ 200 OK                   │
     │ { message }              │
     │<─────────────────────────┤
     │                          │
     │ Redirect to /login       │
     │                          │
```

### API Endpoint

**POST** `/v1/auth/reset-password`

### Request Body

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass123!"
}
```

### Response (200 OK)

```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

### Backend Implementation Steps

1. **Verify token**
   - Validate JWT signature
   - Check expiration
   - Extract userId from payload

2. **Check token usage**
   - Query `passwordResetTokens` table
   - Ensure token hasn't been used
   - Ensure token is within expiration window

3. **Update password**
   - Hash new password with bcrypt
   - Update user's password field
   - Update `passwordChangedAt` timestamp

4. **Cleanup**
   - Mark reset token as used
   - Delete/invalidate old reset tokens
   - Invalidate all existing refresh tokens (force re-login)

5. **Send confirmation email**
   - Notify user that password was changed
   - Include timestamp and IP address

---

## 6. Change Password Flow (Authenticated)

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ POST /auth/change-password│
     │ Authorization: Bearer token│
     │ { currentPassword,       │
     │   newPassword }          │
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Verify access token
     │                          │ 2. Get userId from token
     │                          │ 3. Verify currentPassword
     │                          │ 4. Hash newPassword
     │                          │ 5. Update password
     │                          │ 6. Invalidate refresh tokens
     │                          │
     │ 200 OK                   │
     │ { message }              │
     │<─────────────────────────┤
     │                          │
```

### API Endpoint

**POST** `/v1/auth/change-password`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Body

```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```

### Response (200 OK)

```json
{
  "message": "Password changed successfully"
}
```

### Backend Implementation Steps

1. **Authenticate user**
   - Verify access token
   - Extract userId from token

2. **✅ Check if password exists (CRITICAL)**
   - If `user.password === null`, return 400
   - Message: "No password set for this account. Use /auth/link-local-account to set a password first."
   - This happens when OAuth users haven't set a password yet

3. **Verify current password**
   - Compare with stored hash
   - Return 400 if incorrect

4. **Validate new password**
   - Check strength requirements
   - Ensure different from current password

5. **Update password**
   - Hash new password
   - Update database
   - Update `passwordChangedAt` timestamp

6. **Security actions**
   - Invalidate all refresh tokens
   - User must re-login with new password
   - Send confirmation email

---

## 10. Link Local Account Flow (OAuth Users)

### Use Case
OAuth users (Google/Facebook) who want to set a password as backup login method

### Flow Diagram

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │ Backend │                │  Email   │
└────┬────┘                └────┬────┘                │ Service  │
     │                          │                     └────┬─────┘
     │ POST /auth/link-local-account│                      │
     │ Authorization: Bearer token  │                      │
     │ { password }         │                              │
     ├─────────────────────────────>│                      │
     │                          │                          │
     │                          │ 1. Verify access token   │
     │                          │ 2. Check user.provider   │
     │                          │ 3. Check if password exists│
     │                          │ 4. Hash and set password │
     │                          │ 5. Keep original provider│
     │                          │                          │
     │                          │ Send confirmation email  │
     │                          ├─────────────────────────>│
     │                          │                          │
     │ 200 OK                   │                          │
     │ { message }              │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
```

### API Endpoint

**POST** `/v1/auth/link-local-account`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Request Body

```json
{
  "password": "NewSecurePass123!"
}
```

### Response (200 OK)

```json
{
  "message": "Local login enabled successfully. You can now login with email and password."
}
```

### Response (400 Bad Request) - Already Has Password

```json
{
  "statusCode": 400,
  "message": "Password is already set. Use /auth/change-password instead.",
  "error": "Bad Request"
}
```

### Response (400 Bad Request) - Local Account

```json
{
  "statusCode": 400,
  "message": "Account already uses email/password login",
  "error": "Bad Request"
}
```

### Backend Implementation Steps

1. **Authenticate user**
   - Verify access token
   - Extract userId from token

2. **Check provider**
   - Only OAuth users (google, facebook) can link local account
   - If `user.provider === 'local'`, return 400

3. **Check if password exists**
   - If `user.password !== null`, return 400
   - Message: "Password is already set. Use change-password instead."

4. **Validate password**
   - Check strength requirements
   - Minimum 8 characters, etc.

5. **Set password**
   - Hash password with bcrypt
   - Update `user.password`
   - Keep `user.provider` as original (google/facebook)
   - User can now login with both methods

6. **Send confirmation email**
   - Notify user that local login is enabled
   - Include timestamp and IP address

---

## 11. Account Linking & Management

### Scenario 1: OAuth User Wants Local Login

**Problem:** User registered with Google/Facebook and wants to set password for backup login

**Solution:** Use `/auth/link-local-account` endpoint
- OAuth user sets a password
- Original provider stays (google/facebook)
- User can now login with:
  - Email + Password (local)
  - OAuth (Google/Facebook)

### Scenario 2: Duplicate Accounts (Future Feature)

**Problem:** User has 2 separate accounts:
- `user@gmail.com` via email/password registration
- `user@gmail.com` via Google OAuth

**Current Behavior:**
- Two separate accounts exist
- User must choose which one to use

**Recommended Future Solution:**
1. Detect duplicate email during OAuth login
2. Prompt user: "An account with this email already exists. Link accounts?"
3. Require user to verify current account (enter password)
4. Merge accounts:
   - Keep user's chosen primary provider
   - Preserve all user data
   - Link both authentication methods

### Scenario 3: Unlink Provider (Future Feature)

**Use Case:** User wants to remove OAuth provider from their account

**Requirements:**
- Must have at least 1 authentication method remaining
- If removing OAuth and no password set, require password setup first
- Confirmation required before unlinking

---

## 12. Error Handling & Edge Cases

### Email Verification Errors

**Token Expired:**
```json
{
  "statusCode": 401,
  "message": "Verification token has expired. Please request a new one.",
  "error": "Unauthorized"
}
```

**Token Already Used / Email Already Verified:**
```json
{
  "statusCode": 200,
  "message": "Email is already verified. You can login now."
}
```

**Invalid Token:**
```json
{
  "statusCode": 401,
  "message": "Invalid verification token",
  "error": "Unauthorized"
}
```

### Password Reset Errors

**Token Expired:**
```json
{
  "statusCode": 401,
  "message": "Reset token has expired. Please request a new one.",
  "error": "Unauthorized"
}
```

**OAuth User Attempting Reset:**
```json
{
  "statusCode": 400,
  "message": "This account uses google login. Please use 'google' to sign in.",
  "error": "Bad Request"
}
```

**Token Already Used:**
```json
{
  "statusCode": 400,
  "message": "This reset link has already been used. Please request a new one.",
  "error": "Bad Request"
}
```

### Login Errors

**Invalid Credentials:**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

**Email Not Verified:**
```json
{
  "statusCode": 401,
  "message": "Please verify your email before logging in. Check your inbox for verification link.",
  "error": "Unauthorized"
}
```

**Account Inactive:**
```json
{
  "statusCode": 403,
  "message": "Your account is inactive. Please contact support.",
  "error": "Forbidden"
}
```

**Account Disabled:**
```json
{
  "statusCode": 403,
  "message": "Your account has been disabled. Please contact support.",
  "error": "Forbidden"
}
```

**Too Many Login Attempts:**
```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Please try again in 15 minutes.",
  "error": "Too Many Requests",
  "retryAfter": 900
}
```

### Change Password Errors

**OAuth User Without Password:**
```json
{
  "statusCode": 400,
  "message": "No password set for this account. Use /auth/link-local-account to set a password first.",
  "error": "Bad Request"
}
```

**Current Password Incorrect:**
```json
{
  "statusCode": 400,
  "message": "Current password is incorrect",
  "error": "Bad Request"
}
```

**New Password Same as Current:**
```json
{
  "statusCode": 400,
  "message": "New password must be different from current password",
  "error": "Bad Request"
}
```

### Resend Verification Errors

**OAuth User:**
```json
{
  "statusCode": 400,
  "message": "This account uses google login and doesn't require email verification.",
  "error": "Bad Request"
}
```

**Already Verified:**
```json
{
  "statusCode": 400,
  "message": "Email is already verified",
  "error": "Bad Request"
}
```

### Token Refresh Errors

**Invalid Refresh Token:**
```json
{
  "statusCode": 401,
  "message": "Invalid refresh token",
  "error": "Unauthorized"
}
```

**Token Revoked:**
```json
{
  "statusCode": 401,
  "message": "Refresh token has been revoked",
  "error": "Unauthorized"
}
```

---

## 13. Rate Limiting Configuration

### Per Endpoint Limits

| Endpoint | Limit | Window | Tracking Method |
|----------|-------|--------|-----------------|
| `/auth/register` | 5 | 1 hour | IP + Email |
| `/auth/login` | 5 | 15 min | IP + Email |
| `/auth/verify-email` | No limit | - | Token-based (single use) |
| `/auth/resend-verification` | 3 | 1 hour | Email |
| `/auth/forgot-password` | 3 | 1 hour | Email |
| `/auth/reset-password` | 10 | 1 hour | Token-based |
| `/auth/change-password` | 5 | 1 hour | User ID |
| `/auth/link-local-account` | 5 | 1 hour | User ID |
| `/auth/refresh` | 10 | 1 min | Refresh Token |
| `/auth/logout` | 20 | 1 min | Access Token |
| OAuth Callbacks | 10 | 1 min | IP |

### Rate Limit Response Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests",
  "retryAfter": 900
}
```

**Response Headers:**
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 900
```

### Implementation Notes

- **IP Tracking**: Use `X-Forwarded-For` header behind proxies
- **Email Tracking**: Prevent email enumeration by still rate limiting even if email doesn't exist
- **Token Tracking**: Track by token ID (jti) to prevent token replay
- **Storage**: Use Redis for distributed rate limiting
- **Bypass**: Allow admins to bypass rate limits (careful!)

---

## 14. Security Audit Logging

### Events to Log

#### Authentication Events
- `AUTH_REGISTER` - New user registration
- `AUTH_EMAIL_VERIFIED` - Email verification completed
- `AUTH_LOGIN_SUCCESS` - Successful login
- `AUTH_LOGIN_FAILED` - Failed login attempt
- `AUTH_LOGOUT` - User logout
- `AUTH_TOKEN_REFRESHED` - Token refresh
- `AUTH_PASSWORD_RESET_REQUESTED` - Password reset email sent
- `AUTH_PASSWORD_RESET_COMPLETED` - Password successfully reset
- `AUTH_PASSWORD_CHANGED` - Password changed (authenticated)
- `AUTH_OAUTH_LOGIN` - OAuth login (Google/Facebook)
- `AUTH_LOCAL_ACCOUNT_LINKED` - Local account linked to OAuth
- `AUTH_RESEND_VERIFICATION` - Verification email resent

#### Security Events
- `AUTH_SUSPICIOUS_LOGIN` - Login from unusual location/device
- `AUTH_BRUTE_FORCE_DETECTED` - Multiple failed login attempts
- `AUTH_RATE_LIMIT_EXCEEDED` - Rate limit hit
- `AUTH_TOKEN_BLACKLISTED` - Token manually revoked
- `AUTH_INVALID_TOKEN` - Invalid token used
- `AUTH_EXPIRED_TOKEN` - Expired token attempted
- `AUTH_ACCOUNT_LOCKED` - Account locked due to suspicious activity
- `AUTH_ACCOUNT_UNLOCKED` - Account unlocked by admin

### Log Structure

```typescript
interface AuditLog {
  id: string;
  userId: string | null; // null for failed login attempts
  event: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

### Example Log Entries

**Successful Login:**
```json
{
  "id": "log_abc123",
  "userId": "user_xyz789",
  "event": "AUTH_LOGIN_SUCCESS",
  "status": "SUCCESS",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  "metadata": {
    "provider": "local",
    "device": "Chrome on Windows",
    "location": "Jakarta, Indonesia"
  },
  "timestamp": "2026-01-18T10:30:00Z"
}
```

**Failed Login:**
```json
{
  "id": "log_abc124",
  "userId": null,
  "event": "AUTH_LOGIN_FAILED",
  "status": "FAILURE",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "email": "user@example.com",
    "reason": "invalid_credentials",
    "attemptCount": 3
  },
  "timestamp": "2026-01-18T10:31:00Z"
}
```

**OAuth Login:**
```json
{
  "id": "log_abc125",
  "userId": "user_xyz789",
  "event": "AUTH_OAUTH_LOGIN",
  "status": "SUCCESS",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "provider": "google",
    "providerId": "1234567890",
    "newUser": false
  },
  "timestamp": "2026-01-18T10:32:00Z"
}
```

**Local Account Linked:**
```json
{
  "id": "log_abc127",
  "userId": "user_xyz789",
  "event": "AUTH_LOCAL_ACCOUNT_LINKED",
  "status": "SUCCESS",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "previousProvider": "google",
    "passwordSet": true
  },
  "timestamp": "2026-01-18T10:35:00Z"
}
```

**Suspicious Activity:**
```json
{
  "id": "log_abc126",
  "userId": "user_xyz789",
  "event": "AUTH_SUSPICIOUS_LOGIN",
  "status": "WARNING",
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "reason": "unusual_location",
    "previousLocation": "Jakarta, Indonesia",
    "currentLocation": "Moscow, Russia",
    "timeDifference": "2 hours"
  },
  "timestamp": "2026-01-18T12:00:00Z"
}
```

### Monitoring & Alerts

**Alert Triggers:**
- 5+ failed login attempts from same IP in 5 minutes
- Login from new country/device without 2FA
- Multiple password reset requests in short time
- Token refresh from different IP than original login
- Sudden spike in registration from same IP range

**Notification Methods:**
- Email to user for suspicious activity
- Email to admin for security events
- Slack/Discord webhook for critical events
- Dashboard for real-time monitoring

---

## 15. Security Best Practices

### Flow Diagram

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐
│ Client  │     │ Backend │     │  OAuth   │     │  Email  │
│         │     │         │     │ Provider │     │ Service │
└────┬────┘     └────┬────┘     └────┬─────┘     └────┬────┘
     │               │               │                 │
     │ Click "Login with Google"     │                 │
     ├──────────────>│               │                 │
     │               │               │                 │
     │ Redirect to Google            │                 │
     │ /auth/google  │               │                 │
     ├──────────────>│               │                 │
     │               │               │                 │
     │               │ Redirect to OAuth consent       │
     │<──────────────┤───────────────>│                 │
     │               │               │                 │
     │ User approves │               │                 │
     ├───────────────┼───────────────>│                 │
     │               │               │                 │
     │               │ Callback with auth code         │
     │               │<───────────────┤                 │
     │               │               │                 │
     │               │ Exchange code for tokens        │
     │               ├───────────────>│                 │
     │               │               │                 │
     │               │ User profile  │                 │
     │               │<───────────────┤                 │
     │               │               │                 │
     │               │ 1. Find/create user             │
     │               │ 2. Set emailVerified = true     │
     │               │ 3. Generate JWT tokens          │
     │               │               │                 │
     │ 200 OK        │               │                 │
     │ { accessToken,│               │                 │
     │   refreshToken,│              │                 │
     │   user }      │               │                 │
     │<──────────────┤               │                 │
     │               │               │                 │
```

### Google OAuth2 Endpoints

**Initiate:** `GET /v1/auth/google`

**Callback:** `GET /v1/auth/google/callback?code=xxx&state=yyy`

### Facebook OAuth2 Endpoints

**Initiate:** `GET /v1/auth/facebook`

**Callback:** `GET /v1/auth/facebook/callback?code=xxx&state=yyy`

### Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "CUSTOMER",
    "provider": "google",
    "providerId": "1234567890",
    "emailVerified": true,
    "createdAt": "2025-12-30T10:00:00Z"
  }
}
```

### Backend Implementation Steps

1. **Redirect to OAuth provider**
   - Generate state parameter (CSRF protection)
   - Include scope: `email profile`
   - Redirect user to OAuth consent screen

2. **Handle callback**
   - Verify state parameter
   - Exchange authorization code for access token

3. **Fetch user profile**
   - Call provider's API to get user info
   - Extract email, name, profile picture

4. **Find or create user**
   - Search by `provider` + `providerId`
   - If not found, search by email
   - If still not found, create new user

5. **Set user properties**
   - `provider: 'google'` or `'facebook'`
   - `providerId: <oauth_user_id>`
   - `emailVerified: true` (OAuth emails are pre-verified)
   - `password: null` (OAuth users don't have passwords)

6. **Generate JWT tokens**
   - Same as email/password login
   - Return access + refresh tokens

---

## 8. Token Refresh Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ Access token expired     │
     │ (401 from API call)      │
     │                          │
     │ POST /auth/refresh       │
     │ { refreshToken }         │
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Verify refresh token
     │                          │ 2. Check token in DB
     │                          │ 3. Check expiration
     │                          │ 4. Generate new access token
     │                          │ 5. Optionally rotate refresh token
     │                          │
     │ 200 OK                   │
     │ { accessToken,           │
     │   expiresIn }            │
     │<─────────────────────────┤
     │                          │
     │ Retry original API call  │
     │                          │
```

### API Endpoint

**POST** `/v1/auth/refresh`

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Backend Implementation Steps

1. **Verify refresh token**
   - Validate JWT signature
   - Check expiration
   - Extract userId and token ID (jti)

2. **Check database**
   - Query `refreshTokens` table
   - Ensure token exists and is not revoked
   - Verify userId matches

3. **Generate new access token**
   - Create new JWT with 15 minutes expiration
   - Include userId, email, role

4. **Optional: Refresh token rotation**
   - Generate new refresh token
   - Revoke old refresh token
   - Return new refresh token (enhanced security)

---

## 9. Logout Flow

### Flow Diagram

```
┌─────────┐                ┌─────────┐
│ Client  │                │ Backend │
└────┬────┘                └────┬────┘
     │                          │
     │ POST /auth/logout        │
     │ Authorization: Bearer token│
     ├─────────────────────────>│
     │                          │
     │                          │ 1. Verify access token
     │                          │ 2. Extract userId
     │                          │ 3. Revoke refresh tokens
     │                          │ 4. Add access token to blacklist
     │                          │
     │ 200 OK                   │
     │ { message }              │
     │<─────────────────────────┤
     │                          │
     │ Clear tokens from storage│
     │ Redirect to /login       │
     │                          │
```

### API Endpoint

**POST** `/v1/auth/logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (200 OK)

```json
{
  "message": "Logout successful"
}
```

### Backend Implementation Steps

1. **Verify access token**
   - Extract userId from token

2. **Revoke refresh tokens**
   - Delete all refresh tokens for user
   - Or mark as revoked in database

3. **Blacklist access token (If the access token is in long time)**
   - Add token to Redis blacklist
   - TTL = token remaining lifetime
   - Check blacklist on all authenticated requests

4. **Return success**
   - Frontend clears tokens from storage

---

## 10. Security Best Practices

### Password Security

✅ **DO:**
- Use bcrypt with salt rounds ≥ 12
- Enforce minimum 8 characters
- Require mix of uppercase, lowercase, numbers, symbols (optional)
- Implement password strength meter on frontend
- Hash passwords before storing

❌ **DON'T:**
- Store passwords in plain text
- Use weak hashing algorithms (MD5, SHA1)
- Share passwords via email
- Log passwords in application logs

### Token Security

✅ **DO:**
- Use short-lived access tokens (15 minutes)
- Use longer refresh tokens (7 days)
- Implement token rotation for refresh tokens
- Store refresh tokens securely in database
- Use HTTPS for all token transmission
- Implement token blacklisting for logout
- Sign tokens with strong secret key (min 256 bits)

❌ **DON'T:**
- Store access tokens in localStorage (use httpOnly cookies if possible)
- Use long-lived access tokens (>1 hour)
- Expose JWT secret key
- Reuse token IDs (jti)

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/register` | 3 requests | 15 minutes |
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/forgot-password` | 3 requests | 15 minutes |
| `/auth/resend-verification` | 3 requests | 15 minutes |
| `/auth/refresh` | 10 requests | 1 minute |

### Email Security

✅ **DO:**
- Use verified email service (SendGrid, AWS SES, Mailgun)
- Implement SPF, DKIM, DMARC records
- Include expiration time in emails
- Use HTTPS links only
- Rate limit email sending
- Log email delivery status

❌ **DON'T:**
- Include sensitive data in email subject
- Use GET requests for sensitive actions (use POST)
- Send passwords via email

### Session Security

✅ **DO:**
- Implement CSRF protection
- Use secure, httpOnly cookies
- Set SameSite=Strict or Lax
- Implement device tracking (optional)
- Log authentication events
- Monitor for suspicious activity

❌ **DON'T:**
- Allow concurrent sessions from different IPs (flag as suspicious)
- Skip user-agent validation
- Ignore unusual login patterns

### OAuth2 Security

✅ **DO:**
- Validate state parameter (CSRF protection)
- Use PKCE for mobile apps
- Verify redirect URIs
- Store OAuth tokens securely
- Implement scope restrictions
- Handle OAuth errors gracefully

❌ **DON'T:**
- Skip state parameter validation
- Trust OAuth profile data without verification
- Allow open redirect vulnerabilities

---

## 📊 Complete Authentication Flow Summary

```
Registration Flow:
Register → Send Email → Verify Email → Login

Login Flow:
Login → Validate Credentials → Return Tokens → Access Protected Routes

Forgot Password Flow:
Request Reset → Send Email → Reset Password → Login

Password Change Flow:
Authenticate → Verify Current Password → Update → Invalidate Sessions

OAuth2 Flow:
Redirect to Provider → User Approves → Callback → Return Tokens

Token Management:
Access Token Expires → Refresh Token → New Access Token → Continue

Logout Flow:
Revoke Tokens → Blacklist Access Token → Clear Client Storage
```

---

## 🔧 Implementation Checklist

### Backend

- [ ] User model with `emailVerified`, `provider`, `providerId` fields
- [ ] Password hashing with bcrypt (12+ rounds)
- [ ] JWT token generation (access + refresh)
- [ ] Refresh token storage in database
- [ ] Token blacklist (Redis recommended)
- [ ] Email service integration (SendGrid/AWS SES)
- [ ] Email templates (verification, password reset, confirmation)
- [ ] Rate limiting middleware
- [ ] OAuth2 Passport strategies (Google, Facebook)
- [ ] Password validation (strength, common passwords)
- [ ] Audit logging for authentication events
- [ ] CSRF protection
- [ ] Input sanitization and validation
- [ ] **Provider validation** for forgot-password
- [ ] **Provider validation** for resend-verification
- [ ] **Link local account** endpoint for OAuth users
- [ ] **Password existence check** in change-password
- [ ] **Security audit logging** system
- [ ] **Rate limiting** per email (not just IP)

### Frontend

- [ ] Registration form with validation
- [ ] Email verification page
- [ ] Login form with error handling
- [ ] Forgot password flow
- [ ] Reset password page
- [ ] Change password form
- [ ] OAuth2 buttons (Google, Facebook)
- [ ] Token storage (secure method)
- [ ] Automatic token refresh interceptor
- [ ] Logout functionality
- [ ] Password strength indicator
- [ ] Loading states and error messages
- [ ] Redirect after authentication
- [ ] **Link local account** page for OAuth users
- [ ] **Error handling** for all edge cases
- [ ] **Rate limit** feedback to users

### Database

- [ ] Users table with authentication fields
- [ ] RefreshTokens table
- [ ] PasswordResetTokens table
- [ ] AuditLog table for authentication events
- [ ] Indexes on email, provider, providerId

### Email Templates

- [ ] Welcome email
- [ ] Email verification
- [ ] Password reset request
- [ ] Password changed confirmation
- [ ] New login notification (optional)
- [ ] Suspicious activity alert (optional)
- [ ] **Local account linked** confirmation

---

## 📚 Additional Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [NestJS Passport Documentation](https://docs.nestjs.com/security/authentication)
- [Bcrypt Best Practices](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns)

---

## 🎯 Next Steps

1. Implement DTOs for all authentication endpoints
2. Create AuthService with all authentication methods
3. Set up email service and templates
4. Implement Passport strategies for OAuth2
5. Add rate limiting middleware
6. Create authentication guards and decorators
7. Write integration tests for all flows
8. Document environment variables
9. Set up monitoring and alerts
10. **Implement provider validation** in forgot-password, resend-verification
11. **Add link-local-account** endpoint for OAuth users
12. **Set up audit logging** for security events
13. **Configure rate limiting** with Redis

---

**Last Updated:** January 23, 2026
**Version:** 2.0.0

**Major Changes in v2.0.0:**
- Added Link Local Account flow for OAuth users
- Added Account Linking & Management section
- Added comprehensive Error Handling & Edge Cases
- Added Rate Limiting Configuration details
- Added Security Audit Logging section
- Provider validation for password-related operations
- Enhanced security best practices
