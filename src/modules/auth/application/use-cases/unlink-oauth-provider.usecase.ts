import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId } from '../../domain/value-objects';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';
import { AccountNotFoundError, ProviderNotLinkedError } from '../errors';

interface UnlinkOAuthProviderCommand {
  accountId: string;
  provider: AuthProvider;
}

export class UnlinkOAuthProviderUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
  ) { }

  async execute(command: UnlinkOAuthProviderCommand): Promise<void> {
    const account = await this.accountRepository.findById(AccountId.fromString(command.accountId));
    if (!account) {
      throw new AccountNotFoundError(command.accountId);
    }

    if (!account.hasProvider(command.provider)) {
      throw new ProviderNotLinkedError(command.provider, account.id.getValue());
    }

    account.unlinkProvider(command.provider);
    await this.accountRepository.save(account);
  }
}
