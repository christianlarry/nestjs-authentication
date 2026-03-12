import { DomainError } from 'src/core/domain/domain-error.base';
import { UserErrorCode } from './enums/user-error-code.enum';

export class InvalidAvatarUrlError extends DomainError {
  readonly code = UserErrorCode.INVALID_AVATAR_URL;

  constructor(message: string = 'The provided avatar URL is invalid.') {
    super(message);
  }
}
