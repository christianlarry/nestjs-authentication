import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidResetPasswordTokenError extends DomainError {
  readonly code = AuthErrorCode.INVALID_RESET_PASSWORD_TOKEN

  constructor(message: string = 'The reset password token provided is invalid or has expired.') {
    super(message);
  }
}