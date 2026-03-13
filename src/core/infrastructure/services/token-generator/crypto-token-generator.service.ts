import { TokenGenerator } from "./interfaces/token-generator.interface";
import crypto from "crypto";

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateWithHash(): { raw: string; hashed: string; } {
    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');

    return { raw, hashed };
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}