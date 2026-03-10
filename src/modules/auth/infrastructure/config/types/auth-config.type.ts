export type AuthConfig = {
  accessTokenExpirationMinutes: number;
  refreshTokenExpirationDays: number;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  verificationTokenExpirationHours: number;
  verificationTokenSecret: string;
  forgotPasswordTokenExpirationHours: number;
  forgotPasswordTokenSecret: string;
}