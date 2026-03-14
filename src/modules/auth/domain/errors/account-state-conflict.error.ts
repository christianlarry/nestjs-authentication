import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class AccountStateConflictError extends DomainError {
  readonly code = AuthErrorCode.ACCOUNT_STATE_CONFLICT;

  constructor(message?: string) {
    super(message || 'Account state conflict');
  }
}