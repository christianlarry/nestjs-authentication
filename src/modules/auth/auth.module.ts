import { Module } from '@nestjs/common';
import { AuthController } from './presentation/http/auth.controller';
import { ACCOUNT_REPOSITORY_TOKEN } from './domain/repositories/account-repository.interface';
import { PrismaAccountRepository } from './infrastructure/repositories/prisma-account.repository';
import { ACCOUNT_QUERY_REPOSITORY_TOKEN } from './domain/repositories/account-query-repository.interface';
import { PrismaAccountQueryRepository } from './infrastructure/repositories/prisma-account-query.repository';
import { PASSWORD_HASHER_TOKEN } from './application/interfaces/password-hasher.interface';
import { Argon2PasswordHasher } from './infrastructure/password-hasher/argon2-password.hasher';

@Module({
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
    }
  ],
})
export class AuthModule { }
