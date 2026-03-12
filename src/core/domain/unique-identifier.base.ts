export abstract class UniqueIdentifier {
  protected readonly value: string;
  protected readonly UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  protected constructor(value: string, validateError: Error) {
    this.value = value;
    this.validate(validateError);
  }

  protected validate(error: Error): void {
    if (!this.UUID_REGEX.test(this.value)) {
      throw error;
    }
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: UniqueIdentifier): boolean {
    return this.value === other.value;
  }
}