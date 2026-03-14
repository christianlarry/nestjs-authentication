import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { Account } from '../../domain/entity/account.entity';
import { AuthProvider as AuthProviderName } from '../../domain/enums/auth-provider.enum';
import { AuthProvider as AuthProviderVO, Email } from '../../domain/value-objects';
import { AccessTokenGenerator, RefreshTokenGenerator } from '../../infrastructure/jwt-generator';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { InvalidCredentialsError, ProviderAlreadyLinkedError } from '../errors';

interface OAuthLoginOrRegisterCommand {
  provider: AuthProviderName;
  providerId: string;
  email: string | null;
  fullName: string;
  avatarUrl?: string | null;
}

interface OAuthLoginOrRegisterResult {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  isNewAccount: boolean;
  providerLinked: boolean;
}

export class OAuthLoginOrRegisterUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) { }

  async execute(command: OAuthLoginOrRegisterCommand): Promise<OAuthLoginOrRegisterResult> {
    const accountByProvider = await this.accountRepository.findByProvider(
      command.provider,
      command.providerId,
    );

    if (accountByProvider) {
      const handled = this.handleExistingAccount(accountByProvider, command);
      await this.accountRepository.save(handled.account);
      return this.generateAuthResult(handled.account, handled.isNewAccount, handled.providerLinked);
    }

    if (!command.email) {
      throw new InvalidCredentialsError('OAuth provider did not return an email address.');
    }

    const email = Email.create(command.email);
    const existingAccount = await this.accountRepository.findByEmail(email);

    const { account, isNewAccount, providerLinked } = existingAccount
      ? this.handleExistingAccount(existingAccount, command)
      : this.handleNewAccount(command);

    await this.accountRepository.save(account);

    return this.generateAuthResult(account, isNewAccount, providerLinked);
  }

  private async generateAuthResult(
    account: Account,
    isNewAccount: boolean,
    providerLinked: boolean,
  ): Promise<OAuthLoginOrRegisterResult> {
    const accessToken = await this.accessTokenGenerator.generate({
      accountId: account.id.getValue(),
      email: account.email.getValue(),
      role: account.role,
    });

    const refreshToken = await this.refreshTokenGenerator.generate({
      accountId: account.id.getValue(),
    });

    await this.refreshTokenRepository.save(refreshToken, account.id.getValue());

    return {
      accountId: account.id.getValue(),
      accessToken,
      refreshToken,
      isNewAccount,
      providerLinked,
    };
  }

  private handleExistingAccount(
    account: Account,
    command: OAuthLoginOrRegisterCommand,
  ): { account: Account; isNewAccount: false; providerLinked: boolean } {
    const provider = account.providers.find(
      (p) => p.getProviderName() === command.provider,
    );

    if (provider && provider.getProviderId() !== command.providerId) {
      throw new ProviderAlreadyLinkedError(command.provider, account.id.getValue());
    }

    if (!provider) {
      account.linkProvider(
        AuthProviderVO.reconstruct(command.provider, command.providerId, new Date()),
      );
    }

    account.recordSuccessfulOAuthLogin(
      command.provider,
      command.avatarUrl ?? null,
      command.fullName,
    );

    return {
      account,
      isNewAccount: false,
      providerLinked: !provider,
    };
  }

  private handleNewAccount(
    command: OAuthLoginOrRegisterCommand,
  ): { account: Account; isNewAccount: true; providerLinked: true } {
    const account = Account.createFromOAuth({
      email: command.email!,
      provider: command.provider,
      providerId: command.providerId,
      fullName: command.fullName,
    });

    return {
      account,
      isNewAccount: true,
      providerLinked: true,
    };
  }
}
