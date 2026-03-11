# NestJS Authentication

Backend autentikasi modular berbasis NestJS untuk kebutuhan login modern: registrasi email/password, verifikasi email, reset password, refresh token, social login OAuth2, rate limiting, mail queue, dan token/state management dengan Redis.

README ini disusun berdasarkan rencana implementasi di folder `docs` dan kondisi repository saat ini. Karena codebase masih pada tahap scaffold awal, beberapa bagian di bawah adalah **target arsitektur** yang akan dibangun, bukan seluruhnya sudah aktif di source code saat ini.

## Ringkasan

Project ini dirancang sebagai layanan autentikasi yang aman dan terpisah, dengan fokus pada:

- NestJS sebagai application framework utama
- Fastify sebagai HTTP adapter target deployment
- Argon2 untuk password hashing
- PostgreSQL native driver tanpa ORM
- Redis untuk rate limit, blacklist token, dan penyimpanan state/token sementara
- Mailer service + queue untuk email verifikasi, reset password, dan notifikasi keamanan
- JWT access token dan refresh token
- OAuth2 untuk Google

## Fitur Utama

- Registrasi akun dengan email/password
- Verifikasi email sebelum login lokal diizinkan
- Login lokal dengan access token dan refresh token
- Refresh access token menggunakan refresh token
- Logout dengan mekanisme revoke atau blacklist token
- Forgot password dan reset password berbasis token sementara
- Resend verification email
- OAuth2 login via Google dan Facebook
- Link akun lokal dengan akun social login
- Rate limiting untuk endpoint sensitif seperti login, register, dan forgot password
- Mail queue untuk pengiriman email asynchronous
- Struktur modular agar mudah dikembangkan menjadi auth service production-ready

## Stack Teknologi

### Core

- NestJS 11
- TypeScript
- JWT
- Passport untuk strategi autentikasi
- BullMQ untuk background job email

### Target Infrastruktur

- Fastify untuk HTTP server NestJS
- PostgreSQL dengan native driver `pg` atau query layer manual tanpa ORM
- Redis untuk cache dan auth state transient
- SMTP mailer service untuk transactional email
- Argon2 untuk password hashing

### Tooling

- ESLint
- Prettier
- Jest
- class-validator
- class-transformer

## Arsitektur yang Direncanakan

Sistem ini mengikuti pendekatan modular dan separation of concerns.

### Lapisan utama

- `core/config`: konfigurasi aplikasi dan validasi environment variables
- `core/infrastructure/mailer`: integrasi mail transport
- `core/infrastructure/services/mail`: mail queue, processor, dan template email
- `core/infrastructure/persistence/postgre`: layer akses PostgreSQL native
- `core/infrastructure/persistence/redis`: koneksi dan utilitas Redis
- `modules/auth/application`: use case bisnis autentikasi
- `modules/auth/infrastructure`: auth config, strategi OAuth, JWT, persistence adapter
- `modules/auth/presentation/http`: controller, DTO, dan contract HTTP

### Peran tiap storage

- PostgreSQL: data utama user, refresh token metadata, audit trail, relasi akun social, dan data otoritatif lainnya
- Redis: rate limiting counter, blacklist token, verification token state, forgot password token state, dan cache auth sementara

## Authentication Flows

### 1. Registrasi akun lokal

Alur umum:

1. User mengirim email, password, dan nama
2. Password di-hash dengan Argon2
3. User disimpan ke PostgreSQL dalam status belum terverifikasi
4. Verification token dibuat dan state token disimpan di Redis
5. Email verifikasi dikirim melalui mail queue

### 2. Verifikasi email

1. User membuka link verifikasi dari email
2. Backend memvalidasi token dan state token di Redis
3. Status email user di PostgreSQL diubah menjadi verified
4. Token verification dihapus atau ditandai tidak valid

### 3. Login lokal

1. User login dengan email dan password
2. Backend memastikan email telah diverifikasi
3. Password diverifikasi menggunakan Argon2 verify
4. Access token dan refresh token diterbitkan
5. Metadata refresh token dapat disimpan untuk revoke atau rotation

### 4. Refresh token

1. Client mengirim refresh token
2. Backend memverifikasi signature, expiry, dan status token
3. Access token baru diterbitkan
4. Opsi rotation dapat diterapkan untuk refresh token

### 5. Logout

1. Access token atau refresh token direvoke
2. Token yang tidak boleh dipakai lagi dimasukkan ke blacklist Redis
3. Sesi client berakhir

### 6. Forgot password dan reset password

1. User meminta reset password
2. Backend menghasilkan reset token berdurasi singkat
3. State token disimpan di Redis
4. Email reset password dikirim
5. User submit token dan password baru
6. Password baru di-hash dengan Argon2 lalu disimpan ke PostgreSQL

### 7. OAuth2 login

1. Frontend redirect ke endpoint OAuth provider
2. Provider mengembalikan callback dengan authorization code
3. Backend tukar code menjadi profile user
4. User baru dibuat atau akun lama di-link
5. Backend menerbitkan JWT yang sama seperti login lokal

## Daftar Endpoint Auth

Endpoint berikut dirangkum dari dokumen perencanaan.

| Method | Endpoint | Auth | Deskripsi |
| --- | --- | --- | --- |
| POST | `/v1/auth/register` | No | Registrasi akun baru |
| POST | `/v1/auth/verify-email` | No | Verifikasi email dengan token |
| POST | `/v1/auth/resend-verification` | No | Kirim ulang email verifikasi |
| POST | `/v1/auth/check-email` | No | Cek ketersediaan email |
| POST | `/v1/auth/login` | No | Login email/password |
| POST | `/v1/auth/refresh` | No | Refresh access token |
| POST | `/v1/auth/logout` | Yes | Logout dan revoke token |
| POST | `/v1/auth/forgot-password` | No | Request reset password |
| POST | `/v1/auth/reset-password` | No | Reset password dengan token |
| POST | `/v1/auth/change-password` | Yes | Ganti password saat sudah login |
| GET | `/v1/auth/google` | No | Inisialisasi Google OAuth2 |
| GET | `/v1/auth/google/callback` | No | Callback Google OAuth2 |
| GET | `/v1/auth/facebook` | No | Inisialisasi Facebook OAuth2 |
| GET | `/v1/auth/facebook/callback` | No | Callback Facebook OAuth2 |
| POST | `/v1/auth/link-local-account` | No | Link akun lokal dan social account |

## Kebijakan Keamanan

### Token lifetime target

| Token | Default |
| --- | --- |
| Access token | 15 menit |
| Refresh token | 30 hari pada config saat ini, target bisa disesuaikan |
| Verification token | 24 jam |
| Forgot password token | 1 jam |

### Proteksi yang direncanakan

- Password hashing dengan Argon2
- Email verification sebelum login lokal
- Token blacklist di Redis
- Rate limiting berbasis Redis
- Penyimpanan state token sementara di Redis
- Password reset token berdurasi singkat
- Proteksi brute force pada login dan forgot password
- Audit logging untuk event autentikasi penting

### Rate limit global saat ini

Berdasarkan config saat ini:

- `RATE_LIMIT`: default `100`
- `RATE_LIMIT_TTL`: default `60000` ms

Untuk endpoint sensitif, rencana project di dokumen menyarankan limit yang lebih ketat per endpoint, misalnya login, register, dan forgot password.

## Struktur Folder

```text
src/
  app.module.ts
  main.ts
  core/
    config/
    infrastructure/
      mailer/
      persistence/
        postgre/
        redis/
      services/
        mail/
  modules/
    auth/
      application/
        usecases/
      infrastructure/
        config/
      presentation/
        http/
          dtos/
```

Struktur ini menunjukkan intent yang baik: domain auth dipisahkan dari concern infrastruktur, sehingga lebih mudah untuk testing, scaling, dan maintainability.

## Konfigurasi Environment

Repository saat ini sudah memiliki validasi environment untuk app, auth, Redis, mail, dan OAuth provider. Contoh variabel yang relevan:

```env
# App
NODE_ENV=development
APP_NAME=nestjs-authentication
APP_PORT=3000
API_PREFIX=api
FRONTEND_DOMAIN=http://localhost:3001
BACKEND_DOMAIN=http://localhost:3000
DOCS_URL=http://localhost:3000/docs

# JWT / Auth
ACCESS_TOKEN_SECRET=change-me
REFRESH_TOKEN_SECRET=change-me
VERIFICATION_TOKEN_SECRET=change-me
FORGOT_PASSWORD_TOKEN_SECRET=change-me
ACCESS_TOKEN_EXPIRATION_MINUTES=15
REFRESH_TOKEN_EXPIRATION_DAYS=30
VERIFICATION_TOKEN_EXPIRATION_HOURS=24
FORGOT_PASSWORD_TOKEN_EXPIRATION_HOURS=1

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Mail
MAIL_HOST=localhost
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_DEFAULT_EMAIL=noreply@example.com
MAIL_DEFAULT_NAME=Auth Service
MAIL_IGNORE_TLS=false
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false

# OAuth2 Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# OAuth2 Facebook
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/v1/auth/facebook/callback

# PostgreSQL native driver
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=auth_db
POSTGRES_SSL=false
```

Catatan:

- Variabel PostgreSQL di atas adalah rekomendasi dokumentasi README karena layer PostgreSQL native belum terdefinisi di config repository saat ini.
- Untuk production, semua secret wajib diganti dan tidak boleh memakai fallback default.

## Menjalankan Project

### Install dependency

```bash
npm install
```

### Menjalankan aplikasi

```bash
npm run start
npm run start:dev
npm run start:prod
```

### Quality checks

```bash
npm run lint
npm run test
npm run test:cov
```

## Rekomendasi Dependency Target

Jika project akan mengikuti arsitektur yang dideskripsikan di dokumen, dependency berikut akan relevan atau perlu dipastikan terpasang:

```bash
npm install @nestjs/platform-fastify @fastify/helmet @fastify/cors
npm install argon2 pg ioredis
npm install nodemailer
npm install passport passport-google-oauth20 passport-facebook
```

## Status Repository Saat Ini

Kondisi source code saat README ini dibuat:

- Struktur module auth, Redis, mail service, dan config sudah mulai disiapkan
- Validasi environment variables sudah ada untuk beberapa modul inti
- Mail queue module sudah mulai dibentuk dengan BullMQ
- Controller auth dan app module masih minimal
- Adapter Fastify belum diaktifkan di bootstrap
- PostgreSQL native layer belum terimplementasi
- Flow autentikasi di dokumen masih lebih lengkap daripada implementasi code saat ini

Artinya, repository ini sudah memiliki arah arsitektur yang jelas, tetapi implementasi fiturnya masih dalam tahap pengembangan.

## Referensi Dokumen Internal

Folder `docs` berisi perencanaan yang menjadi dasar README ini:

- `docs/AUTH_ENDPOINTS_SUMMARY.md`
- `docs/AUTHENTICATION_FLOW.md`
- `docs/OAUTH2_SETUP.md`

Dokumen tersebut menjelaskan alur endpoint, flow verifikasi email, forgot password, OAuth2, serta kebutuhan keamanan yang menjadi acuan implementasi.

## Roadmap Implementasi yang Disarankan

1. Ganti bootstrap ke Fastify adapter dan pasang plugin dasar keamanan
2. Tambahkan persistence PostgreSQL native untuk users, sessions, refresh tokens, dan audit logs
3. Implementasikan hashing Argon2 untuk register, login, change password, dan reset password
4. Tambahkan Redis untuk blacklist token, rate limiting, verification token, dan reset token state
5. Lengkapi HTTP DTO, validation pipe, guard, strategy, dan auth use case
6. Lengkapi mail workflow untuk verification, password reset, dan login alert
7. Tambahkan integration test untuk flow register, verify, login, refresh, logout, dan reset password

## Lisensi

Belum ditentukan.
