import { Inject } from "@nestjs/common";
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from "../../domain/repositories/account-repository.interface";
import { EmailVerificationTokenRepository } from "../../infrastructure/repositories/email-verification-token.repository";
import { InvalidOrExpiredTokenError } from "../errors";
import { AccountId } from "../../domain/value-objects";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EmailVerifiedApplicationEvent } from "../events/email-verified.event";

interface VerifyEmailCommand {
  token: string;
}

export class VerifyEmailUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,
    private readonly eventEmitter: EventEmitter2
  ) { }

  async execute(command: VerifyEmailCommand): Promise<void> {
    try {
      // Find Token
      const accountId = await this.emailVerificationTokenRepository.get(command.token);
      if (!accountId) throw new InvalidOrExpiredTokenError();

      // Mark Account's Email as Verified
      const account = await this.accountRepository.findById(AccountId.fromString(accountId));
      if (!account) throw new InvalidOrExpiredTokenError();

      account.verifyEmail();

      await this.accountRepository.save(account);
      await this.emailVerificationTokenRepository.invalidate(command.token);

      // Emit EmailVerified App Event/Integration Event, Untuk side effect lain di infrastructure, Misal: Send Welcome Email, Log Aktivitas, dll
      this.eventEmitter.emit(
        EmailVerifiedApplicationEvent.EventName,
        new EmailVerifiedApplicationEvent({
          accountId: account.id.getValue(),
          email: account.email.getValue(),
          verifiedAt: new Date(),
        })
      )

    } catch (err) {
      if (err instanceof InvalidOrExpiredTokenError) {
        throw err; // Rethrow known error untuk ditangani di controller
      }
      throw new InvalidOrExpiredTokenError(); // Generalize error untuk menghindari bocornya informasi sensitif
    }
  }
}