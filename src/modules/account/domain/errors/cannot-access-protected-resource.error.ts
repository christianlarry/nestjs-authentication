import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotAccessProtectedResourceError extends DomainError {
  readonly code = AuthErrorCode.CANNOT_ACCESS_PROTECTED_RESOURCE;

  constructor(message: string = 'Cannot access protected resource due to insufficient permissions.') {
    super(message);
  }
}