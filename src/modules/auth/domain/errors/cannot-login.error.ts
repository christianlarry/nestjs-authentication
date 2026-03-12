import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotLoginError extends DomainError {
  readonly code: string = AuthErrorCode.CANNOT_LOGIN;

  constructor(message: string = 'Cannot login user due to invalid state.') {
    super(message);
  }
}