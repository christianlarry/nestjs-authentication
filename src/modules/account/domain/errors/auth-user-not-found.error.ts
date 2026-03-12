
import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class AuthUserNotFoundError extends DomainError {
  readonly code = AuthErrorCode.AUTH_USER_NOT_FOUND;

  constructor(message = 'Authentication user not found.') {
    super(message);
  }
}