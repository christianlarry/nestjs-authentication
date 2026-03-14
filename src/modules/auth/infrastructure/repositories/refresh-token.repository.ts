import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllConfigType } from "src/core/config/config.type";
import { CacheService } from "src/core/infrastructure/services/cache/cache.service";
import crypto from 'crypto';

@Injectable()
export class RefreshTokenRepository {

  private readonly CACHE_KEY_PREFIX = 'refresh-token:';
  private readonly ACCOUNT_INDEX_PREFIX = 'refresh-token-account:';
  private readonly TOKEN_EXPIRATION_SECONDS; // 30 days

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService<AllConfigType>
  ) {
    this.TOKEN_EXPIRATION_SECONDS = this.config.get<number>('auth.refreshTokenExpirationDays', { infer: true }) * 24 * 60 * 60;
  }

  async save(token: string, accountId?: string) {
    const hashedToken = await this.hashToken(token);

    await this.cache.set(
      `${this.CACHE_KEY_PREFIX}${hashedToken}`,
      accountId ?? 'valid',
      this.TOKEN_EXPIRATION_SECONDS
    );

    if (accountId) {
      await this.addTokenToAccountIndex(accountId, hashedToken);
    }
  }

  async get<T>(token: string): Promise<T | null> {
    const hashedToken = await this.hashToken(token);

    const result = await this.cache.get(`${this.CACHE_KEY_PREFIX}${hashedToken}`);
    return result as T || null;
  }

  async invalidate(token: string) {
    const hashedToken = await this.hashToken(token);

    const ownerAccountId = await this.cache.get<string>(`${this.CACHE_KEY_PREFIX}${hashedToken}`);
    if (ownerAccountId && ownerAccountId !== 'valid') {
      await this.removeTokenFromAccountIndex(ownerAccountId, hashedToken);
    }

    await this.cache.del(`${this.CACHE_KEY_PREFIX}${hashedToken}`);
  }

  async invalidateAllByAccountId(accountId: string): Promise<void> {
    const accountIndexKey = `${this.ACCOUNT_INDEX_PREFIX}${accountId}`;
    const hashedTokens = await this.cache.get<string[]>(accountIndexKey);

    if (hashedTokens?.length) {
      await Promise.all(
        hashedTokens.map((hashedToken) =>
          this.cache.del(`${this.CACHE_KEY_PREFIX}${hashedToken}`),
        ),
      );
    }

    await this.cache.del(accountIndexKey);
  }

  private async hashToken(token: string): Promise<string> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    return `hashed-${hashed}`;
  }

  private async addTokenToAccountIndex(accountId: string, hashedToken: string): Promise<void> {
    const accountIndexKey = `${this.ACCOUNT_INDEX_PREFIX}${accountId}`;
    const currentTokens = await this.cache.get<string[]>(accountIndexKey);

    const nextTokens = currentTokens ? [...currentTokens, hashedToken] : [hashedToken];
    const deduplicatedTokens = Array.from(new Set(nextTokens));

    await this.cache.set(
      accountIndexKey,
      deduplicatedTokens,
      this.TOKEN_EXPIRATION_SECONDS,
    );
  }

  private async removeTokenFromAccountIndex(accountId: string, hashedToken: string): Promise<void> {
    const accountIndexKey = `${this.ACCOUNT_INDEX_PREFIX}${accountId}`;
    const currentTokens = await this.cache.get<string[]>(accountIndexKey);
    if (!currentTokens?.length) return;

    const nextTokens = currentTokens.filter((item) => item !== hashedToken);
    if (!nextTokens.length) {
      await this.cache.del(accountIndexKey);
      return;
    }

    await this.cache.set(
      accountIndexKey,
      nextTokens,
      this.TOKEN_EXPIRATION_SECONDS,
    );
  }
}