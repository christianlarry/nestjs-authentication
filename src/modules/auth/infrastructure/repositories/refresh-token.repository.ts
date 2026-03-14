import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllConfigType } from "src/core/config/config.type";
import { CacheService } from "src/core/infrastructure/services/cache/cache.service";
import crypto from 'crypto';

@Injectable()
export class RefreshTokenRepository {

  private readonly CACHE_KEY_PREFIX = 'refresh-token:';
  private readonly TOKEN_EXPIRATION_SECONDS; // 30 days

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService<AllConfigType>
  ) {
    this.TOKEN_EXPIRATION_SECONDS = this.config.get<number>('auth.refreshTokenExpirationDays', { infer: true }) * 24 * 60 * 60;
  }

  async save(token: string) {
    const hashedToken = await this.hashToken(token);
    await this.cache.set(
      `${this.CACHE_KEY_PREFIX}${hashedToken}`,
      'valid',
      this.TOKEN_EXPIRATION_SECONDS
    );
  }

  async get<T>(token: string): Promise<T | null> {
    const hashedToken = await this.hashToken(token);

    const result = await this.cache.get(`${this.CACHE_KEY_PREFIX}${hashedToken}`);
    return result as T || null;
  }

  async invalidate(token: string) {
    const hashedToken = await this.hashToken(token);

    await this.cache.del(`${this.CACHE_KEY_PREFIX}${hashedToken}`);
  }

  private async hashToken(token: string): Promise<string> {
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    return `hashed-${hashed}`;
  }
}