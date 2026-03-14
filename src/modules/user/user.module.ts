import { Module } from "@nestjs/common";
import { USER_REPOSITORY_TOKEN } from "./domain/repositories/user-repository.interface";
import { PrismaUserRepository } from "./infrastructure/repositories/prisma-user.repository";
import { USER_QUERY_REPOSITORY_TOKEN } from "./domain/repositories/user-query-repository.interface";
import { PrismaUserQueryRepository } from "./infrastructure/repositories/prisma-user-query.repository";
import { CreateUserOnAccountRegisteredListener } from "./application/listeners/create-user-on-account-registered.listener";

@Module({
  providers: [
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository
    },
    {
      provide: USER_QUERY_REPOSITORY_TOKEN,
      useClass: PrismaUserQueryRepository
    },

    // Application Listeners
    CreateUserOnAccountRegisteredListener,
  ],
  exports: [
    USER_QUERY_REPOSITORY_TOKEN,
    USER_REPOSITORY_TOKEN,
  ]
})
export class UserModule { }