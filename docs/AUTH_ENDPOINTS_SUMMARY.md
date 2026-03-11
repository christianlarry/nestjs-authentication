# 🚀 Authentication Endpoints - Quick Reference

## Overview
Sistem autentikasi yang lengkap dan aman dengan email verification, password reset, dan OAuth2 integration.

---

## 📍 All Authentication Endpoints

### 1. **Registration & Verification**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/v1/auth/register` | ❌ No | Register akun baru + kirim email verifikasi |
| `POST` | `/v1/auth/verify-email` | ❌ No | Verifikasi email dengan token |
| `POST` | `/v1/auth/resend-verification` | ❌ No | Kirim ulang email verifikasi |
| `POST` | `/v1/auth/check-email` | ❌ No | Cek ketersediaan email |

### 2. **Login & Session**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/v1/auth/login` | ❌ No | Login dengan email/password (harus verified) |
| `POST` | `/v1/auth/refresh` | ❌ No | Refresh access token dengan refresh token |
| `POST` | `/v1/auth/logout` | ✅ Yes | Logout dan revoke tokens |

### 3. **Password Management**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/v1/auth/forgot-password` | ❌ No | Request password reset (kirim email) |
| `POST` | `/v1/auth/reset-password` | ❌ No | Reset password dengan token dari email |
| `POST` | `/v1/auth/change-password` | ✅ Yes | Ganti password (user sudah login) |

### 4. **OAuth2 Social Login**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/v1/auth/google` | ❌ No | Initiate Google OAuth2 login |
| `GET` | `/v1/auth/google/callback` | ❌ No | Google OAuth2 callback handler |
| `GET` | `/v1/auth/facebook` | ❌ No | Initiate Facebook OAuth2 login |
| `GET` | `/v1/auth/facebook/callback` | ❌ No | Facebook OAuth2 callback handler |

### 5. **Account Linking**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/v1/auth/link-local-account` | ❌ No | Initiate Google OAuth2 login |

---

## 🔥 Quick Examples

### Register New User
```bash
POST /v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

---

### Verify Email
```bash
POST /v1/auth/verify-email
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Email verified successfully. You can now login."
}
```

---

### Login
```bash
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CUSTOMER"
  }
}
```

---

### Forgot Password
```bash
POST /v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### Reset Password
```bash
POST /v1/auth/reset-password
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

---

### Change Password (Authenticated)
```bash
POST /v1/auth/change-password
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

---

### Refresh Token
```bash
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### Logout
```bash
POST /v1/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

---

## 🎯 User Journey Examples

### Journey 1: Email/Password Registration
```
1. POST /auth/register (email, password, name)
   → User receives email dengan verification link

2. User klik link → POST /auth/verify-email (token)
   → Email verified

3. POST /auth/login (email, password)
   → Receive accessToken & refreshToken
   → Store tokens
   → Access protected routes
```

### Journey 2: Forgot Password
```
1. POST /auth/forgot-password (email)
   → User receives email dengan reset link

2. User klik link → POST /auth/reset-password (token, newPassword)
   → Password berhasil direset

3. POST /auth/login (email, newPassword)
   → Login dengan password baru
```

### Journey 3: OAuth2 Login (Google)
```
1. Frontend redirect ke: GET /auth/google
   → User dibawa ke Google consent screen

2. User approve → Google redirect ke: /auth/google/callback?code=xxx
   → Backend exchange code for tokens
   → Return accessToken & refreshToken

3. Frontend store tokens → Access protected routes
```

### Journey 4: Token Refresh
```
1. API call dengan accessToken → 401 Unauthorized (token expired)

2. POST /auth/refresh (refreshToken)
   → Receive new accessToken

3. Retry original API call dengan new accessToken
   → Success
```

---

## 🔒 Security Features

### ✅ Implemented

- **Email Verification**: Required sebelum login
- **Password Hashing**: Bcrypt dengan salt rounds 12+
- **JWT Tokens**: Access (15m) + Refresh (7d) tokens
- **Token Blacklisting**: Untuk logout
- **Rate Limiting**: Prevent brute force attacks
- **CSRF Protection**: State parameter di OAuth2
- **Password Reset**: Secure token-based flow
- **OAuth2 Integration**: Google & Facebook
- **Audit Logging**: Track authentication events

### 🎯 Token Expiration

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 15 minutes | API access |
| Refresh Token | 7 days | Renew access token |
| Email Verification Token | 24 hours | Verify email |
| Password Reset Token | 1 hour | Reset password |

### 🚫 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/register` | 3 requests | 15 minutes |
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/forgot-password` | 3 requests | 15 minutes |
| `/auth/resend-verification` | 3 requests | 15 minutes |

---

## 📋 Validation Rules

### Password Requirements
- Minimum 8 karakter
- Maksimum 255 karakter
- Recommended: Mix uppercase, lowercase, numbers, symbols

### Email Requirements
- Valid email format
- Maximum 255 karakter
- Unique (tidak boleh duplicate)

---

## ⚠️ Common Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

### 401 Unauthorized - Invalid Credentials
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

### 401 Unauthorized - Email Not Verified
```json
{
  "statusCode": 401,
  "message": "Please verify your email before logging in",
  "error": "Unauthorized"
}
```

### 409 Conflict - Email Already Exists
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

### 429 Too Many Requests
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please try again later.",
  "error": "Too Many Requests"
}
```

---

## 🛠️ Implementation Guide

### 1. Environment Variables
```env
# JWT
JWT_SECRET=your-super-secret-key-min-256-bits
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@keramik-store.com
EMAIL_VERIFICATION_URL=https://keramik-store.com/verify-email
PASSWORD_RESET_URL=https://keramik-store.com/reset-password

# OAuth2 Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# OAuth2 Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/v1/auth/facebook/callback

# Rate Limiting
RATE_LIMIT_TTL=900
RATE_LIMIT_MAX=3
```

### 2. Required Database Tables

**Users Table**
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password (VARCHAR, nullable for OAuth users)
- name (VARCHAR)
- role (ENUM: ADMIN, STAFF, CUSTOMER)
- provider (ENUM: local, google, facebook)
- providerId (VARCHAR, nullable)
- emailVerified (BOOLEAN, default: false)
- emailVerifiedAt (TIMESTAMP, nullable)
- passwordChangedAt (TIMESTAMP, nullable)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**RefreshTokens Table**
```sql
- id (UUID, PK)
- userId (UUID, FK → Users)
- token (TEXT)
- jti (VARCHAR, UNIQUE)
- expiresAt (TIMESTAMP)
- revoked (BOOLEAN, default: false)
- createdAt (TIMESTAMP)
```

**PasswordResetTokens Table**
```sql
- id (UUID, PK)
- userId (UUID, FK → Users)
- token (VARCHAR, hashed)
- expiresAt (TIMESTAMP)
- used (BOOLEAN, default: false)
- createdAt (TIMESTAMP)
```

### 3. Required NestJS Modules

```typescript
// auth.module.ts
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PassportModule,
    UsersModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    RefreshTokenStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## 📚 Related Documentation

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Detailed flow diagrams dan implementation steps
- [OAUTH2_SETUP.md](./OAUTH2_SETUP.md) - Google & Facebook OAuth2 setup guide
- [openapi.yaml](./openapi.yaml) - Complete API specification

---

**Last Updated:** December 31, 2025
**API Version:** 1.0.0
