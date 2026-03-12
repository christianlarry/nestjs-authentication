export const PASSWORD_HASHER_TOKEN = 'PASSWORD_HASHER';

export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, hashedPassword: string): Promise<boolean>;
}