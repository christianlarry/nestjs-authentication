import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AllConfigType } from "src/core/config/config.type";
import { v4 as uuidv4 } from 'uuid'
import { GenerateAccessTokenParams } from "./interfaces/generate-access-token-params.interface";
import { AccessTokenPayload } from "./interfaces/access-token-payload.interface";

@Injectable()
export class AccessTokenGenerator {

  private readonly secret: string;
  private readonly expirationTimeInSeconds: number;

  static readonly TokenType = 'ACCESS_TOKEN';

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>
  ) {
    this.secret = this.configService.get<string>('auth.accessTokenSecret', { infer: true })!;
    this.expirationTimeInSeconds = (this.configService.get<number>('auth.accessTokenExpirationMinutes', { infer: true })!) * 60;
  }

  async generate(params: GenerateAccessTokenParams): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: params.accountId,
      email: params.email,
      role: params.role,
      type: AccessTokenGenerator.TokenType,
      jti: uuidv4(),
    };

    return this.jwtService.signAsync(payload, {
      secret: this.secret,
      expiresIn: this.expirationTimeInSeconds
    });
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token);
  }

  async decode(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.decode<AccessTokenPayload>(token);
  }
}