import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

const PasswordErrorCode = {
  TOO_SHORT: "PASSWORD_TOO_SHORT",
  TOO_LONG: "PASSWORD_TOO_LONG",
  NO_UPPERCASE: "PASSWORD_NO_UPPERCASE",
  NO_LOWERCASE: "PASSWORD_NO_LOWERCASE",
  NO_NUMBER: "PASSWORD_NO_NUMBER",
  NO_SPECIAL_CHAR: "PASSWORD_NO_SPECIAL_CHAR",
} as const

type PasswordErrorCode = typeof PasswordErrorCode[keyof typeof PasswordErrorCode];

export class PasswordTooWeakError extends DomainError {
  readonly code = AuthErrorCode.PASSWORD_TOO_WEAK;

  constructor(reason?: PasswordErrorCode) {
    switch (reason) {
      case PasswordErrorCode.TOO_SHORT:
        super("The password is too short.");
        break;
      case PasswordErrorCode.TOO_LONG:
        super("The password is too long.");
        break;
      case PasswordErrorCode.NO_UPPERCASE:
        super("The password must contain at least one uppercase letter.");
        break;
      case PasswordErrorCode.NO_LOWERCASE:
        super("The password must contain at least one lowercase letter.");
        break;
      case PasswordErrorCode.NO_NUMBER:
        super("The password must contain at least one number.");
        break;
      case PasswordErrorCode.NO_SPECIAL_CHAR:
        super("The password must contain at least one special character.");
        break;
      default:
        super("The password is too weak.");
    }
  }
}