import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId, Password } from '../../domain/value-objects';
import { PASSWORD_HASHER_TOKEN, type PasswordHasher } from '../interfaces/password-hasher.interface';
import { AccountNotFoundError, PasswordAlreadySetError } from '../errors';

interface LinkLocalCredentialsCommand {
  accountId: string;
  password: string;
}

export class LinkLocalCredentialsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
  ) { }

  async execute(command: LinkLocalCredentialsCommand): Promise<void> {
    const account = await this.accountRepository.findById(AccountId.fromString(command.accountId));
    if (!account) {
      throw new AccountNotFoundError(command.accountId);
    }

    if (account.hasPassword) {
      throw new PasswordAlreadySetError(account.id.getValue());
    }

    Password.validateRaw(command.password);
    const hashedPassword = await this.passwordHasher.hash(command.password);

    account.resetPassword(hashedPassword);

    await this.accountRepository.save(account);
  }
}
