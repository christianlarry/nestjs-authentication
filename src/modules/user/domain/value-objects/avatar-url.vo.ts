import { InvalidAvatarUrlError } from '../errors';

/**
 * AvatarUrl value object.
 * Must be a valid absolute HTTP/HTTPS URL with a maximum length of 1000 characters.
 */
export class AvatarUrl {
  private readonly value: string;
  private static readonly MAX_LENGTH = 1000;

  private constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidAvatarUrlError('Avatar URL cannot be empty.');
    }
    if (trimmed.length > AvatarUrl.MAX_LENGTH) {
      throw new InvalidAvatarUrlError(
        `Avatar URL must not exceed ${AvatarUrl.MAX_LENGTH} characters.`,
      );
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new InvalidAvatarUrlError(
          'Avatar URL must use the HTTP or HTTPS protocol.',
        );
      }
    } catch {
      throw new InvalidAvatarUrlError(`"${trimmed}" is not a valid URL.`);
    }

    this.value = trimmed;
  }

  public static create(value: string): AvatarUrl {
    return new AvatarUrl(value);
  }

  public getValue(): string {
    return this.value;
  }

  public equals(other: AvatarUrl): boolean {
    return this.value === other.value;
  }
}
