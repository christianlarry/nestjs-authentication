import { OnEvent } from "@nestjs/event-emitter";
import { AccountRegisteredApplicationEvent } from "../events/account-registered.event";
import { MailService } from "src/core/infrastructure/services/mail/mail.service";
import { Inject, Logger } from "@nestjs/common";
import { TOKEN_GENERATOR_TOKEN, type TokenGenerator } from "src/core/infrastructure/services/token-generator/interfaces/token-generator.interface";
import { EmailVerificationTokenRepository } from "../../infrastructure/repositories/email-verification-token.repository";

export class SendVerificationEmailListener {

  private readonly logger = new Logger(SendVerificationEmailListener.name);

  constructor(
    private readonly mailService: MailService,
    private readonly emailVerificationTokenRepository: EmailVerificationTokenRepository,

    @Inject(TOKEN_GENERATOR_TOKEN)
    private readonly tokenGenerator: TokenGenerator
  ) { }

  @OnEvent(AccountRegisteredApplicationEvent.EventName, { async: true })
  async handle(e: AccountRegisteredApplicationEvent) {
    const payload = e.payload

    // Generate Verification Token & Persist it with Expiry (e.g., 24 hours)
    const verificationToken = this.generateVerificationToken();

    // Persist the token with association to the user ID and set an expiration time (Using Redis)
    await this.emailVerificationTokenRepository.save(verificationToken.hashed, payload.accountId);

    // Sending Verification Email
    await this.mailService.sendVerificationEmail({
      name: payload.name,
      to: payload.email,
      token: verificationToken.raw
    })
  }

  private generateVerificationToken(): { raw: string, hashed: string } {
    return this.tokenGenerator.generateWithHash()
  }
}