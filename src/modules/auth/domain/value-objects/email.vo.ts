import { InvalidEmailError } from "../errors";

export class Email {
  private readonly value: string;

  private constructor(email: string) {
    this.value = email;
    this.validate();
  }

  private validate(): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new InvalidEmailError(this.value);
    }
  }

  public static create(email: string): Email {
    return new Email(email);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: Email): boolean {
    return this.value === other.value;
  }
}