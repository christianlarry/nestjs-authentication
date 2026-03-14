import { Inject } from "@nestjs/common";
import { ACCOUNT_QUERY_REPOSITORY_TOKEN, type AccountQueryRepository } from "../../domain/repositories/account-query-repository.interface";
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from "../../domain/repositories/account-repository.interface";
import { Email } from "../../domain/value-objects";
import { PASSWORD_HASHER_TOKEN, type PasswordHasher } from "../interfaces/password-hasher.interface";
import { InvalidCredentialsError } from "../errors";
import { AccessTokenGenerator, RefreshTokenGenerator } from "../../infrastructure/jwt-generator";
import { RefreshTokenRepository } from "../../infrastructure/repositories/refresh-token.repository";

interface LoginCommand {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  accountId: string;
}

export class LoginUseCase {
  constructor(
    @Inject(ACCOUNT_QUERY_REPOSITORY_TOKEN)
    private readonly accountQueryRepository: AccountQueryRepository,
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenGenerator: AccessTokenGenerator,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly refreshTokenRepository: RefreshTokenRepository
  ) { }

  async execute(command: LoginCommand): Promise<LoginResult> {
    // Find Account by Email
    const email = Email.create(command.email);

    const account = await this.accountRepository.findByEmail(email);
    if (!account) throw new InvalidCredentialsError();

    // Assert Account Can Login, Throw if account is not active, banned, or any other state that prevents login
    account.assertCanLogin();

    // Validate Password
    const isPasswordValid = await this.passwordHasher.compare(command.password, account.password!.getValue());
    if (!isPasswordValid) throw new InvalidCredentialsError();

    // Generate Tokens
    const accessToken = await this.accessTokenGenerator.generate({
      accountId: account.id.getValue(),
      email: account.email.getValue(),
      role: account.role,
    });
    const refreshToken = await this.refreshTokenGenerator.generate({
      accountId: account.id.getValue(),
    });

    // Save Refresh Token to DB
    await this.refreshTokenRepository.save(refreshToken);

    // Record Login Successful, Update lastLoginAt
    account.recordSuccessfulLogin();
    await this.accountRepository.save(account);

    // Return Result
    return {
      accountId: account.id.getValue(),
      accessToken,
      refreshToken
    }
  }
}