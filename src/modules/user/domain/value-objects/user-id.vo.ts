import { UniqueIdentifier } from 'src/core/domain/unique-identifier.base';
import { UserNotFoundError } from '../errors';

export class UserId extends UniqueIdentifier {
  private constructor(value: string) {
    super(value, new UserNotFoundError(`Invalid UserId: "${value}" is not a valid UUID.`));
  }

  public static create(): UserId {
    return new UserId(crypto.randomUUID());
  }

  public static fromString(value: string): UserId {
    return new UserId(value);
  }
}
