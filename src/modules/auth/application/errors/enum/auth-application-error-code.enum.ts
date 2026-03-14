export const AuthApplicationErrorCode = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  INVALID_OR_EXPIRED_TOKEN: 'INVALID_OR_EXPIRED_TOKEN',
} as const

export type AuthApplicationErrorCode = typeof AuthApplicationErrorCode[keyof typeof AuthApplicationErrorCode];