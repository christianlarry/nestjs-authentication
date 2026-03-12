import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidAuthStateError extends DomainError {
  readonly code = AuthErrorCode.INVALID_AUTH_STATE;

  constructor(message: string) {
    super(message);
  }
}