import { Module } from "@nestjs/common";
import { TOKEN_GENERATOR_TOKEN } from "./interfaces/token-generator.interface";
import { CryptoTokenGenerator } from "./crypto-token-generator.service";

@Module({
  providers: [
    {
      provide: TOKEN_GENERATOR_TOKEN,
      useClass: CryptoTokenGenerator
    }
  ],
  exports: [TOKEN_GENERATOR_TOKEN],
})
export class TokenGeneratorModule { }