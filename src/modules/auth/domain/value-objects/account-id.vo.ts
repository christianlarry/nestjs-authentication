import { UniqueIdentifier } from 'src/core/domain/unique-identifier.base';
import { InvalidAuthStateError } from '../errors';

export class AccountId extends UniqueIdentifier {
  private constructor(value: string) {
    super(value, new InvalidAuthStateError(`Invalid AccountId: "${value}" is not a valid UUID.`));
  }

  public static create(): AccountId {
    return new AccountId(crypto.randomUUID());
  }

  public static fromString(value: string): AccountId {
    return new AccountId(value);
  }
}
