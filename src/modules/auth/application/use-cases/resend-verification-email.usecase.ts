import { Inject } from '@nestjs/common';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { USER_QUERY_REPOSITORY_TOKEN, type UserQueryRepository } from 'src/modules/user/domain/repositories/user-query-repository.interface';
import { Email } from '../../domain/value-objects';
import { EmailVerificationTokenRepository } from '../../infrastructure/repositories/email-verification-token.repository';
import { TOKEN_GENERATOR_TOKEN, type TokenGenerator } from 'src/core/infrastructure/services/token-generator/interfaces/token-generator.interface';
import { MailService } from 'src/core/infrastructure/services/mail/mail.service';
import { EmailAlreadyVerifiedError } from '../errors';

interface ResendVerificationEmailCommand {
  email: string;
}

export class ResendVerificationEmailUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    @Inject(USER_QUERY_REPOSITORY_TOKEN)
    private readonly userQueryRepository: UserQueryRepository,
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    @Inject(TOKEN_GENERATOR_TOKEN)
    private readonly tokenGenerator: TokenGenerator,
    private readonly mailService: MailService,
  ) { }

  async execute(command: ResendVerificationEmailCommand): Promise<void> {
    const account = await this.accountRepository.findByEmail(Email.create(command.email));

    // Do not reveal whether an account exists.
    if (!account) return;

    if (account.emailVerified) {
      throw new EmailAlreadyVerifiedError(command.email);
    }

    // Only pending verification accounts are eligible for resend.
    if (!account.isPendingVerification) return;

    const verificationToken = this.tokenGenerator.generateWithHash();

    await this.emailVerificationTokenRepository.save(
      verificationToken.hashed,
      account.id.getValue(),
    );

    const userProfile = await this.userQueryRepository.findByAccountId(account.id.getValue());

    await this.mailService.sendVerificationEmail({
      to: account.email.getValue(),
      name: userProfile?.name ?? 'User',
      token: verificationToken.raw,
    });
  }
}
