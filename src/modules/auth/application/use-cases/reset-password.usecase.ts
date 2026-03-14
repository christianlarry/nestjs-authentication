import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TOKEN_GENERATOR_TOKEN, type TokenGenerator } from 'src/core/infrastructure/services/token-generator/interfaces/token-generator.interface';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId, Password } from '../../domain/value-objects';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { PASSWORD_HASHER_TOKEN, type PasswordHasher } from '../interfaces/password-hasher.interface';
import { InvalidOrExpiredTokenError } from '../errors';
import { PasswordResetApplicationEvent } from '../events/password-reset.event';

interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

export class ResetPasswordUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_GENERATOR_TOKEN)
    private readonly tokenGenerator: TokenGenerator,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(command: ResetPasswordCommand): Promise<void> {
    const hashedToken = this.tokenGenerator.hashToken(command.token);

    const accountId = await this.passwordResetTokenRepository.get<string>(hashedToken);
    if (!accountId) {
      throw new InvalidOrExpiredTokenError();
    }

    const account = await this.accountRepository.findById(AccountId.fromString(accountId));
    if (!account) {
      throw new InvalidOrExpiredTokenError();
    }

    Password.validateRaw(command.newPassword);
    const hashedNewPassword = await this.passwordHasher.hash(command.newPassword);

    account.resetPassword(hashedNewPassword);

    await this.refreshTokenRepository.invalidateAllByAccountId(account.id.getValue());

    await this.accountRepository.save(account);
    await this.passwordResetTokenRepository.invalidate(hashedToken);

    this.eventEmitter.emit(
      PasswordResetApplicationEvent.EventName,
      new PasswordResetApplicationEvent({
        accountId: account.id.getValue(),
        email: account.email.getValue(),
        resetAt: new Date(),
      }),
    );
  }
}
