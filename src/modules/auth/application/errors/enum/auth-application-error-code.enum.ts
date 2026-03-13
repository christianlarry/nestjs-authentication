export const AuthApplicationErrorCode = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
} as const

export type AuthApplicationErrorCode = typeof AuthApplicationErrorCode[keyof typeof AuthApplicationErrorCode];