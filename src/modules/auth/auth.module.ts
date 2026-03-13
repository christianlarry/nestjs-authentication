import { Module } from '@nestjs/common';
import { AuthController } from './presentation/http/auth.controller';
import { ACCOUNT_REPOSITORY_TOKEN } from './domain/repositories/account-repository.interface';
import { PrismaAccountRepository } from './infrastructure/repositories/prisma-account.repository';
import { ACCOUNT_QUERY_REPOSITORY_TOKEN } from './domain/repositories/account-query-repository.interface';
import { PrismaAccountQueryRepository } from './infrastructure/repositories/prisma-account-query.repository';
import { PASSWORD_HASHER_TOKEN } from './application/interfaces/password-hasher.interface';
import { Argon2PasswordHasher } from './infrastructure/password-hasher/argon2-password.hasher';
import { MailModule } from 'src/core/infrastructure/services/mail/mail.module';
import { TokenGeneratorModule } from 'src/core/infrastructure/services/token-generator/token-generator.module';
import { EmailVerificationTokenRepository } from './infrastructure/repositories/email-verification-token.repository';
import { PasswordResetTokenRepository } from './infrastructure/repositories/password-reset-token.repository';
import { BlacklistedAccessTokenRepository } from './infrastructure/repositories/blacklisted-access-token.repository';

@Module({
  imports: [
    MailModule,
    TokenGeneratorModule
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    {
      provide: ACCOUNT_REPOSITORY_TOKEN,
      useClass: PrismaAccountRepository
    },
    {
      provide: ACCOUNT_QUERY_REPOSITORY_TOKEN,
      useClass: PrismaAccountQueryRepository
    },
    {
      provide: PASSWORD_HASHER_TOKEN,
      useClass: Argon2PasswordHasher
    },
    EmailVerificationTokenRepository,
    PasswordResetTokenRepository,
    BlacklistedAccessTokenRepository
  ],
})
export class AuthModule { }
