import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { USER_QUERY_REPOSITORY_TOKEN, type UserQueryRepository } from 'src/modules/user/domain/repositories/user-query-repository.interface';
import { Email } from '../../domain/value-objects';
import { TOKEN_GENERATOR_TOKEN, type TokenGenerator } from 'src/core/infrastructure/services/token-generator/interfaces/token-generator.interface';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { MailService } from 'src/core/infrastructure/services/mail/mail.service';
import { CannotForgotPasswordError } from '../../domain/errors';

interface ForgotPasswordCommand {
  email: string;
}

export class ForgotPasswordUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    @Inject(USER_QUERY_REPOSITORY_TOKEN)
    private readonly userQueryRepository: UserQueryRepository,
    @Inject(TOKEN_GENERATOR_TOKEN)
    private readonly tokenGenerator: TokenGenerator,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly mailService: MailService,
  ) { }

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const account = await this.accountRepository.findByEmail(Email.create(command.email));

    // Do not reveal whether an account exists.
    if (!account) return;

    try {
      account.assertCanForgotPassword();
    } catch (err) {
      // Preserve non-enumeration behavior for this endpoint.
      if (err instanceof CannotForgotPasswordError) return;
      throw err;
    }

    const resetToken = this.tokenGenerator.generateWithHash();

    await this.passwordResetTokenRepository.save(
      resetToken.hashed,
      account.id.getValue(),
    );

    const userProfile = await this.userQueryRepository.findByAccountId(account.id.getValue());

    await this.mailService.sendResetPasswordEmail({
      to: account.email.getValue(),
      name: userProfile?.name ?? 'User',
      token: resetToken.raw,
    });
  }
}
