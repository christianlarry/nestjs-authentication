
import argon2 from 'argon2';
import { PasswordHasher } from '../../application/interfaces/password-hasher.interface';

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return await argon2.hash(plainPassword, {
      type: argon2.argon2id,  // Recommended for most use cases
      memoryCost: 2 ** 16,    // 64 MB
      timeCost: 3,            // Number of iterations  
      parallelism: 4,         // Number of parallel threads
    });
  }

  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await argon2.verify(hashedPassword, plainPassword);
  }
}