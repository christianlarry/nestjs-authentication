import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class EmailAlreadyInUseError extends DomainError {
  readonly code = AuthErrorCode.EMAIL_ALREADY_IN_USE;

  constructor(email?: string) {
    super(`The provided email ${email ?? ''} is already in use.`);
  }
}