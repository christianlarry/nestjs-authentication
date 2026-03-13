export interface TokenGenerator {
  generate(): string;
  generateWithHash(): { raw: string; hashed: string };
  hashToken(raw: string): string;
}

export const TOKEN_GENERATOR_TOKEN = Symbol('TOKEN_GENERATOR_TOKEN');