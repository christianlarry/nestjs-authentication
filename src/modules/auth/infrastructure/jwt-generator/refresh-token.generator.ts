import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AllConfigType } from "src/core/config/config.type";
import { v4 as uuidv4 } from 'uuid'
import { GenerateRefreshTokenParams } from "./interfaces/generate-refresh-token-params.interface";
import { RefreshTokenPayload } from "./interfaces/refresh-token-payload.interface";

@Injectable()
export class RefreshTokenGenerator {

  private readonly secret: string;
  private readonly expirationTimeInSeconds: number;

  static readonly TokenType = 'REFRESH_TOKEN';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>
  ) {
    this.secret = this.configService.get<string>('auth.refreshTokenSecret', { infer: true })!;
    this.expirationTimeInSeconds = (this.configService.get<number>('auth.refreshTokenExpirationDays', { infer: true })!) * 24 * 60 * 60;
  }

  async generate(params: GenerateRefreshTokenParams): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: params.userId,
      type: RefreshTokenGenerator.TokenType,
      jti: uuidv4(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.expirationTimeInSeconds
    });
  }

  async verify(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync<RefreshTokenPayload>(token);
  }

  async decode(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.decode<RefreshTokenPayload>(token);
  }
}