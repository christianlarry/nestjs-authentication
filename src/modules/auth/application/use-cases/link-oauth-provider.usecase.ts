import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId, AuthProvider as AuthProviderVO } from '../../domain/value-objects';
import { AuthProvider } from '../../domain/enums/auth-provider.enum';
import { AccountNotFoundError, ProviderAlreadyLinkedError } from '../errors';

interface LinkOAuthProviderCommand {
  accountId: string;
  provider: AuthProvider;
  providerId: string;
}

interface LinkOAuthProviderResult {
  accountId: string;
  provider: AuthProvider;
}

export class LinkOAuthProviderUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
  ) { }

  async execute(command: LinkOAuthProviderCommand): Promise<LinkOAuthProviderResult> {
    const account = await this.accountRepository.findById(AccountId.fromString(command.accountId));
    if (!account) {
      throw new AccountNotFoundError(command.accountId);
    }

    if (account.hasProvider(command.provider)) {
      throw new ProviderAlreadyLinkedError(command.provider, account.id.getValue());
    }

    account.linkProvider(
      AuthProviderVO.reconstruct(command.provider, command.providerId, new Date()),
    );

    await this.accountRepository.save(account);

    return {
      accountId: account.id.getValue(),
      provider: command.provider,
    };
  }
}
