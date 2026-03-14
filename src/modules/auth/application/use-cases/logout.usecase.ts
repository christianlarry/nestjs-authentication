import { InvalidOrExpiredTokenError } from '../errors';
import { BlacklistedAccessTokenRepository } from '../../infrastructure/repositories/blacklisted-access-token.repository';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { AccessTokenGenerator } from '../../infrastructure/jwt-generator';

interface LogoutCommand {
  accessToken: string;
  refreshToken?: string | null;
}

export class LogoutUseCase {
  constructor(
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly blacklistedAccessTokenRepository: BlacklistedAccessTokenRepository,
  ) { }

  async execute(command: LogoutCommand): Promise<void> {
    const payload = await this.verifyAccessToken(command.accessToken);

    if (command.refreshToken) {
      await this.refreshTokenRepository.invalidate(command.refreshToken);
    }

    const now = Math.floor(Date.now() / 1000);
    const ttlInSeconds = Math.max((payload.exp ?? now) - now, 1);

    await this.blacklistedAccessTokenRepository.save(payload.jti, ttlInSeconds);
  }

  private async verifyAccessToken(token: string): Promise<{ jti: string; exp?: number }> {
    try {
      const payload = await this.accessTokenGenerator.verify(token);
      return { jti: payload.jti, exp: payload.exp };
    } catch {
      throw new InvalidOrExpiredTokenError('Invalid or expired access token.');
    }
  }
}
