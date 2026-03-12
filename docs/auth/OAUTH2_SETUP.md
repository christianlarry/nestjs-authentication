# OAuth2 Authentication Setup

## Overview

This service supports OAuth2 social login via three providers:

1. **Google** — via Google OAuth2 / OpenID Connect
2. **GitHub** — via GitHub OAuth Apps
3. **Facebook** — via Facebook Login / Meta Platform

OAuth2 is implemented using **Passport.js** strategies inside the `auth-google` (and equivalent) NestJS modules, following Clean Architecture — the Passport strategy sits in the **infrastructure layer** and delegates to a **use-case** in the application layer.

---

## Architecture

```
HTTP Request (GET /v1/auth/google)
    │
    ▼
GoogleAuthGuard (Passport OAuth2 strategy)
    ├─ Generate random `state`, store in Redis (TTL 5min)
    └─ Redirect → Google consent page

HTTP Request (GET /v1/auth/google/callback?code=...&state=...)
    │
    ▼
GoogleAuthGuard
    ├─ Validate state from Redis (CSRF protection)
    ├─ Exchange code for access + refresh tokens
    └─ Fetch profile from Google API
    │
    ▼
GoogleAuthCallbackUseCase (Application Layer)
    ├─ Find or create Account by (provider, providerId)
    ├─ Account.createFromOAuth() or recordSuccessfulOAuthLogin()
    ├─ Issue JWT access token + refresh token
    └─ Store SHA-256(refreshToken) in DB
    │
    ▼
Redirect to frontend with tokens
```

---

## 1. Google OAuth2 Setup

### 1.1 Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/v1/auth/google/callback`
   - Production: `https://yourdomain.com/v1/auth/google/callback`
7. Copy the **Client ID** and **Client Secret**

### 1.2 Environment Variables

```dotenv
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/v1/auth/google/callback
```

### 1.3 Config Type

```typescript
// src/modules/auth-google/infrastructure/config/auth-google-config.type.ts
export type AuthGoogleConfig = {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
};
```

### 1.4 Passport Strategy (Infrastructure Layer)

```typescript
// src/modules/auth-google/infrastructure/strategies/google.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AllConfigType } from '@/core/config/config.type';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<AllConfigType>) {
    super({
      clientID: config.get('auth_google.clientID', { infer: true }),
      clientSecret: config.get('auth_google.clientSecret', { infer: true }),
      callbackURL: config.get('auth_google.callbackURL', { infer: true }),
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, name, photos } = profile;
    const user = {
      providerId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      avatarUrl: photos[0]?.value ?? null,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
```

### 1.5 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/auth/google` | Initiates OAuth2; redirects to Google consent |
| `GET` | `/v1/auth/google/callback` | Handles Google callback; creates/links account |

### 1.6 OAuth Scopes Requested

| Scope | Purpose |
|---|---|
| `email` | Retrieve user's email address |
| `profile` | Retrieve user's name and profile picture |

---

## 2. GitHub OAuth2 Setup

### 2.1 GitHub Developer Settings

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps → New OAuth App**
3. Fill in:
   - **Application name**: NestJS Authentication
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/v1/auth/github/callback`
4. Click **Register application**
5. Copy **Client ID** and generate a **Client Secret**

### 2.2 Environment Variables

```dotenv
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
GITHUB_CALLBACK_URL=http://localhost:3000/v1/auth/github/callback
```

### 2.3 Passport Strategy

```typescript
// src/modules/auth-github/infrastructure/strategies/github.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AllConfigType } from '@/core/config/config.type';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService<AllConfigType>) {
    super({
      clientID: config.get('auth_github.clientID', { infer: true }),
      clientSecret: config.get('auth_github.clientSecret', { infer: true }),
      callbackURL: config.get('auth_github.callbackURL', { infer: true }),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ) {
    const primaryEmail = profile.emails?.find((e) => e.value)?.value ?? null;
    const user = {
      providerId: profile.id,
      email: primaryEmail,
      name: profile.displayName ?? profile.username ?? 'GitHub User',
      avatarUrl: profile.photos?.[0]?.value ?? null,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
```

> **Note:** GitHub may not expose the user's email if it is set to private. In that case, make a secondary request to `GET https://api.github.com/user/emails` using the OAuth access token.

### 2.4 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/auth/github` | Initiates OAuth2; redirects to GitHub |
| `GET` | `/v1/auth/github/callback` | Handles GitHub callback; creates/links account |

### 2.5 OAuth Scopes Requested

| Scope | Purpose |
|---|---|
| `user:email` | Access user's email addresses |

---

## 3. Facebook OAuth2 Setup

### 3.1 Meta Developer Console

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app: **Consumer** type
3. Add **Facebook Login** product to the app
4. Under **Facebook Login → Settings**, add **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/v1/auth/facebook/callback`
5. Under **App Settings → Basic**, copy **App ID** and **App Secret**

### 3.2 Environment Variables

```dotenv
FACEBOOK_APP_ID=<your-app-id>
FACEBOOK_APP_SECRET=<your-app-secret>
FACEBOOK_CALLBACK_URL=http://localhost:3000/v1/auth/facebook/callback
```

### 3.3 Passport Strategy

```typescript
// src/modules/auth-facebook/infrastructure/strategies/facebook.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { AllConfigType } from '@/core/config/config.type';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService<AllConfigType>) {
    super({
      clientID: config.get('auth_facebook.clientID', { infer: true }),
      clientSecret: config.get('auth_facebook.clientSecret', { infer: true }),
      callbackURL: config.get('auth_facebook.callbackURL', { infer: true }),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'emails', 'name', 'picture'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user?: any) => void,
  ) {
    const user = {
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
```

### 3.4 Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/auth/facebook` | Initiates OAuth2; redirects to Facebook |
| `GET` | `/v1/auth/facebook/callback` | Handles Facebook callback |

---

## 4. OAuth2 Use Case (Application Layer)

All three providers share the same use-case pattern. The `GoogleAuthCallbackUseCase` below is representative:

```typescript
// src/modules/auth-google/application/google-auth-callback.usecase.ts
export class GoogleAuthCallbackUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepo: IAccountRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(dto: GoogleAuthCallbackDto): Promise<AuthTokensResult> {
    // 1. Find existing account by (GOOGLE, providerId)
    let account = await this.accountRepo.findByProvider(
      AuthProvider.GOOGLE,
      dto.providerId,
    );

    if (!account) {
      // 2. New user — create account from OAuth profile
      account = Account.createFromOAuth({
        email: new Email(dto.email),
        name: new Name(dto.name),
        provider: AuthProvider.GOOGLE,
        providerId: dto.providerId,
        avatarUrl: dto.avatarUrl,
      });
    } else {
      // 3. Returning user — record login
      account.recordSuccessfulOAuthLogin();
    }

    await this.accountRepo.save(account);

    // 4. Issue tokens
    return this.tokenService.issueTokens(account);
  }
}
```

---

## 5. CSRF Protection (State Parameter)

OAuth2 CSRF attacks are prevented by validating the `state` parameter on every callback.

**Initiation:**
```typescript
const state = crypto.randomBytes(16).toString('hex');
await redis.set(`oauth:state:${state}`, '1', 'EX', 300); // 5 minute TTL
// Pass state to provider's redirect URL
```

**Callback validation:**
```typescript
const exists = await redis.get(`oauth:state:${state}`);
if (!exists) throw new BadRequestException('INVALID_STATE');
await redis.del(`oauth:state:${state}`); // Single use
```

---

## 6. Security Notes

### Token Storage

OAuth provider tokens (`accessToken`, `refreshToken`) are **encrypted** at the application layer before being stored in the `auth_providers` table. Never store raw OAuth tokens in the database.

### Account Merging

When an OAuth user arrives with an email that matches an existing local account:
1. **Option A (safer):** Reject and ask the user to log in with their existing method to confirm ownership, then explicitly link the provider
2. **Option B:** Auto-merge only if the provider has verified the email (`email_verified = true` in Google OpenID)

### Refresh Token Absence

GitHub does not issue OAuth refresh tokens by default. Store the access token only. When it expires, the user must re-authenticate.

### Email Availability

Not all providers guarantee a non-null email:
- **Google:** Always provides a verified email
- **GitHub:** Email may be null if user's email is private — request `user:email` scope and call the emails API as fallback
- **Facebook:** Email may be absent if user denied permission — handle gracefully

---

## 7. Frontend Integration

### Initiating OAuth Login

```javascript
// Redirect the user's browser to the backend OAuth endpoint
window.location.href = 'http://localhost:3000/v1/auth/google';
```

### Handling the Callback

After the OAuth flow completes, the backend redirects to the frontend with the access token. Store it securely (in-memory or sessionStorage, **never localStorage**):

```
Frontend callback URL example:
https://yourapp.com/auth/callback?accessToken=<jwt>

The refresh token is set automatically as an httpOnly cookie by the backend.
```

```javascript
// Parse token from URL search params
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('accessToken');
// Store in memory or React state — never in localStorage
```

---

## 8. Required npm Packages

```bash
# Google
npm install passport-google-oauth20 @types/passport-google-oauth20

# GitHub
npm install passport-github2 @types/passport-github2

# Facebook
npm install passport-facebook @types/passport-facebook
```

---

## Related Documentation

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) — Full OAuth2 sequence flows
- [AUTH_ENDPOINTS_SUMMARY.md](./AUTH_ENDPOINTS_SUMMARY.md) — Endpoint reference
- [../SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md) — Security architecture overview

