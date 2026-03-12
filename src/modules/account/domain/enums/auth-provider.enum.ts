export const AuthProvider = {
  GOOGLE: 'GOOGLE',
  FACEBOOK: 'FACEBOOK',
  GITHUB: 'GITHUB',
} as const;

export type AuthProvider = typeof AuthProvider[keyof typeof AuthProvider];