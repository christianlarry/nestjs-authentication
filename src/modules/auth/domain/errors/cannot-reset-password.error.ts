import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotResetPasswordError extends DomainError {
  readonly code = AuthErrorCode.CANNOT_RESET_PASSWORD;

  constructor(message: string = 'Cannot reset password due to invalid user state.') {
    super(message);
  }
}