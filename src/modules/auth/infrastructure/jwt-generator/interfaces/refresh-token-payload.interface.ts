export interface RefreshTokenPayload {
  sub: string;
  type: string;
  jti: string;
  iat?: number;
  exp?: number;
}