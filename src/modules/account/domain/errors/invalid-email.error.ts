import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidEmailError extends DomainError {
  readonly code = AuthErrorCode.INVALID_EMAIL;
  constructor(email: string) {
    super(`Invalid Email: ${email}`);
  }
}