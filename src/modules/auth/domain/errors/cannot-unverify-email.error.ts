import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotUnverifyEmailError extends DomainError {
  readonly code = AuthErrorCode.CANNOT_UNVERIFY_EMAIL;

  constructor(message: string = 'User cannot unverify email. Either already unverified or not verified yet') {
    super(message);
  }
}