import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AllConfigType } from "src/core/config/config.type";
import { CacheService } from "src/core/infrastructure/services/cache/cache.service";

@Injectable()
export class EmailVerificationTokenRepository {

  private readonly CACHE_KEY_PREFIX = 'email-verification-token:';
  private readonly TOKEN_EXPIRATION_SECONDS: number;


  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService<AllConfigType>
  ) {
    this.TOKEN_EXPIRATION_SECONDS = this.config.get<number>('auth.verificationTokenExpirationHours', { infer: true }) * 60 * 60;
  }

  async get(token: string): Promise<string | null> {
    return this.cache.get(`${this.CACHE_KEY_PREFIX}${token}`);
  }

  async save(token: string, accountId: string): Promise<void> {
    await this.cache.set(
      `${this.CACHE_KEY_PREFIX}${token}`,
      accountId,
      this.TOKEN_EXPIRATION_SECONDS
    );
  }

  async invalidate(token: string): Promise<void> {
    await this.cache.del(`${this.CACHE_KEY_PREFIX}${token}`);
  }
}