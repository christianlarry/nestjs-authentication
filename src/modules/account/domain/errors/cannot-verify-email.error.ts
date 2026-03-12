import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotVerifyEmailError extends DomainError {
  readonly code = AuthErrorCode.CANNOT_VERIFY_EMAIL;

  constructor(message: string = 'Failed to verify email') {
    super(message);
  }
}