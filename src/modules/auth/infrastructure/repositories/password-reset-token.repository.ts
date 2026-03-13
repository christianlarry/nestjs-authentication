import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllConfigType } from "src/core/config/config.type";
import { CacheService } from "src/core/infrastructure/services/cache/cache.service";

@Injectable()
export class PasswordResetTokenRepository {

  private readonly CACHE_KEY_PREFIX = 'password-reset-token:';
  private readonly tokenExpirationSeconds: number;

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService<AllConfigType>
  ) {
    this.tokenExpirationSeconds = (this.config.get<number>('auth.forgotPasswordTokenExpirationHours', { infer: true }) || 1) * 60 * 60;
  }

  async invalidate(token: string): Promise<void> {
    await this.cache.del(`${this.CACHE_KEY_PREFIX}${token}`);
  }

  async save(token: string, userId: string): Promise<void> {
    await this.cache.set(
      `${this.CACHE_KEY_PREFIX}${token}`,
      userId,
      this.tokenExpirationSeconds
    );
  }

  async get<T>(token: string): Promise<T | null> {
    return this.cache.get<T>(`${this.CACHE_KEY_PREFIX}${token}`);
  }
}