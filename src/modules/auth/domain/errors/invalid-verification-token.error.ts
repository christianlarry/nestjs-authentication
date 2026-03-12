import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidVerificationTokenError extends DomainError {
  readonly code = AuthErrorCode.INVALID_VERIFICATION_TOKEN

  constructor(message: string = 'The verification token provided is invalid or has expired.') {
    super(message);
  }
}