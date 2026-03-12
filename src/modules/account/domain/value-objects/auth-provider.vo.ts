import { AuthProvider as AuthProviderEnum } from "../enums/auth-provider.enum"
import { InvalidProviderError } from "../errors";

export class AuthProvider {
  private readonly providerName: AuthProviderEnum;
  private readonly providerId: string;
  private readonly linkedAt: Date;

  private constructor(providerName: AuthProviderEnum, providerId: string, linkedAt: Date) {
    this.providerName = providerName;
    this.providerId = providerId;
    this.linkedAt = linkedAt;


    this.validate();
  }

  private validate(): void {
    if (!Object.values(AuthProviderEnum).includes(this.providerName)) {
      throw new InvalidProviderError();
    }
  }

  public static createGoogleProvider(providerId: string): AuthProvider {
    return new AuthProvider(AuthProviderEnum.GOOGLE, providerId, new Date());
  }

  public static createFacebookProvider(providerId: string): AuthProvider {
    return new AuthProvider(AuthProviderEnum.FACEBOOK, providerId, new Date());
  }

  public static createGithubProvider(providerId: string): AuthProvider {
    return new AuthProvider(AuthProviderEnum.GITHUB, providerId, new Date());
  }

  public static reconstruct(provider: AuthProviderEnum, providerId: string, linkedAt: Date): AuthProvider {
    return new AuthProvider(provider, providerId, linkedAt);
  }

  public getValue(): { provider: AuthProviderEnum; providerId: string } {
    return {
      provider: this.providerName,
      providerId: this.providerId,
    };
  }

  public getProviderName(): AuthProviderEnum {
    return this.providerName;
  }

  public getProviderId(): string {
    return this.providerId;
  }

  public getLinkedAt(): Date {
    return this.linkedAt;
  }

  public equals(other: AuthProvider): boolean {
    return (
      this.providerName === other.providerName &&
      this.providerId === other.providerId &&
      this.linkedAt.getTime() === other.linkedAt.getTime()
    );
  }

  public isGoogle(): boolean {
    return this.providerName === AuthProviderEnum.GOOGLE;
  }

  public isFacebook(): boolean {
    return this.providerName === AuthProviderEnum.FACEBOOK;
  }
}