import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId } from '../../domain/value-objects';
import { AccessTokenGenerator, RefreshTokenGenerator } from '../../infrastructure/jwt-generator';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { AccountNotFoundError, InvalidOrExpiredTokenError } from '../errors';

interface RefreshAccessTokenCommand {
  refreshToken: string;
}

interface RefreshAccessTokenResult {
  accountId: string;
  accessToken: string;
  refreshToken: string;
}

export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) { }

  async execute(command: RefreshAccessTokenCommand): Promise<RefreshAccessTokenResult> {
    const refreshTokenPayload = await this.verifyRefreshToken(command.refreshToken);

    const tokenState = await this.refreshTokenRepository.get<string>(command.refreshToken);
    if (!tokenState) {
      throw new InvalidOrExpiredTokenError();
    }

    const account = await this.accountRepository.findById(
      AccountId.fromString(refreshTokenPayload.sub),
    );
    if (!account) {
      throw new AccountNotFoundError(refreshTokenPayload.sub);
    }

    account.assertCanLogin();

    await this.refreshTokenRepository.invalidate(command.refreshToken);

    const accessToken = await this.accessTokenGenerator.generate({
      accountId: account.id.getValue(),
      email: account.email.getValue(),
      role: account.role,
    });

    const newRefreshToken = await this.refreshTokenGenerator.generate({
      accountId: account.id.getValue(),
    });

    await this.refreshTokenRepository.save(newRefreshToken, account.id.getValue());

    return {
      accountId: account.id.getValue(),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    try {
      const payload = await this.refreshTokenGenerator.verify(token);
      return { sub: payload.sub };
    } catch {
      throw new InvalidOrExpiredTokenError();
    }
  }
}
