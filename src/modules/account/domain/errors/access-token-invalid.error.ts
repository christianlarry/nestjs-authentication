import { DomainError } from "src/core/domain/domain-error.base";
import { AuthErrorCode } from "./enums/auth-error-code.enum";

export class AccessTokenInvalidError extends DomainError {
  readonly code = AuthErrorCode.ACCESS_TOKEN_INVALID

  constructor(message: string = 'The access token provided is invalid or has expired.') {
    super(message);
  }
}