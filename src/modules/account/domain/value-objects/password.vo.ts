import { PasswordTooWeakError } from "../errors";

export class Password {
  private readonly value: string;

  private constructor(hashed: string) {
    this.value = hashed;
  }

  public static validateRaw(raw: string): void {
    if (raw.length < 8) throw new PasswordTooWeakError("PASSWORD_TOO_SHORT");
    if (raw.length > 64) throw new PasswordTooWeakError("PASSWORD_TOO_LONG");
    if (!/[a-z]/.test(raw)) throw new PasswordTooWeakError("PASSWORD_NO_LOWERCASE");
    if (!/[A-Z]/.test(raw)) throw new PasswordTooWeakError("PASSWORD_NO_UPPERCASE");
    if (!/[0-9]/.test(raw)) throw new PasswordTooWeakError("PASSWORD_NO_NUMBER");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(raw)) throw new PasswordTooWeakError("PASSWORD_NO_SPECIAL_CHAR");
  }

  public static fromHash(hashed: string): Password {
    return new Password(hashed);
  }

  public getValue(): string {
    return this.value;
  }
}