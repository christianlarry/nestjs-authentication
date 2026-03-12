import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidNameError extends DomainError {
  readonly code = AuthErrorCode.INVALID_NAME;

  constructor(message: string = 'The provided name is invalid.') {
    super(message);
  }
}