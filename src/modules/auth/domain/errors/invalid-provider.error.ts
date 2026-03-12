import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class InvalidProviderError extends DomainError {
  readonly code = AuthErrorCode.INVALID_PROVIDER;

  constructor(message?: string) {
    super(`Invalid authentication provider. ${message ?? ""}`);
  }
} 