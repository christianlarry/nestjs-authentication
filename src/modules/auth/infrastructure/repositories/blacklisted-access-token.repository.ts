import { Injectable } from "@nestjs/common";
import { CacheService } from "src/core/infrastructure/services/cache/cache.service";
import { AccessTokenGenerator } from "../jwt-generator";

@Injectable()
export class BlacklistedAccessTokenRepository {

  private readonly CACHE_KEY_PREFIX = 'blacklisted-access-token:';

  constructor(
    private readonly cache: CacheService,
    private readonly accessTokenGenerator: AccessTokenGenerator
  ) { }

  async get(jti: string): Promise<string | null> {
    return this.cache.get(`${this.CACHE_KEY_PREFIX}${jti}`);
  }

  async save(jti: string, expirationInSeconds: number): Promise<void> {
    await this.cache.set(
      `${this.CACHE_KEY_PREFIX}${jti}`,
      'blacklisted',
      expirationInSeconds
    )
  }

  async invalidate(jti: string): Promise<void> {
    await this.cache.del(`${this.CACHE_KEY_PREFIX}${jti}`);
  }
}