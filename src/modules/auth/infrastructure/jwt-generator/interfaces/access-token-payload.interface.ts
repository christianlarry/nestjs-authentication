export interface AccessTokenPayload {
  sub: string;
  jti: string;
  email: string;
  role: string;
  type: string;
  iat?: number;
  exp?: number;
}