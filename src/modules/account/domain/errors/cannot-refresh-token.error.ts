import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class CannotRefreshTokenError extends DomainError {
  readonly code = AuthErrorCode.CANNOT_REFRESH_TOKEN;

  constructor(message: string = 'Cannot refresh token due to invalid or expired token.') {
    super(message);
  }
}