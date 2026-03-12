import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class UserNotFoundError extends DomainError {
  readonly code = UserErrorCode.USER_NOT_FOUND;

  constructor(message: string = 'User not found.') {
    super(message);
  }
}
