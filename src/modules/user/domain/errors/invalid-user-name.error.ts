import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class InvalidUserNameError extends DomainError {
  readonly code = UserErrorCode.INVALID_USER_NAME;

  constructor(message: string = 'The provided name is invalid.') {
    super(message);
  }
}
