import { Inject } from "@nestjs/common";
import { PASSWORD_HASHER_TOKEN, type PasswordHasher } from "../interfaces/password-hasher.interface";
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from "src/modules/auth/domain/repositories/account-repository.interface";
import { Account } from "src/modules/auth/domain/entity/account.entity";
import { ACCOUNT_QUERY_REPOSITORY_TOKEN, type AccountQueryRepository } from "src/modules/auth/domain/repositories/account-query-repository.interface";
import { Password } from "src/modules/auth/domain/value-objects";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AccountRegisteredApplicationEvent } from "src/modules/auth/application/events/account-registered.event";

interface RegisterCommand {
  name: string;
  credentials: {
    email: string;
    password: string;
  };
}

interface RegisterResult {
  success: boolean;
  message: string;
}

export class RegisterUseCase {

  constructor(
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,

    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,

    @Inject(ACCOUNT_QUERY_REPOSITORY_TOKEN)
    private readonly accountQueryRepository: AccountQueryRepository,

    private readonly eventEmitter: EventEmitter2
  ) { }

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    // Check Email Uniqueness
    const exists = await this.accountQueryRepository.existsByEmail(command.credentials.email);
    if (exists) throw new Error('Email already in use');

    // Validate Raw Password & Hash Password
    Password.validateRaw(command.credentials.password);
    const hashedPassword = await this.passwordHasher.hash(command.credentials.password);

    // Create Account 
    const account = Account.create({
      name: command.name,
      email: command.credentials.email,
      hashedPassword,
    });

    // Persist Account
    await this.accountRepository.save(account);

    // Emit Application Event for Account Creation Side Effect
    this.eventEmitter.emit(
      AccountRegisteredApplicationEvent.EventName,
      new AccountRegisteredApplicationEvent({
        accountId: account.id.getValue(),
        email: account.email.getValue(),
      })
    )

    return {
      success: true,
      message: 'Registration successful'
    };
  }
}