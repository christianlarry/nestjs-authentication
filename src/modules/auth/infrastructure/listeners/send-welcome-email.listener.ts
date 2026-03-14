import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MailService } from "src/core/infrastructure/services/mail/mail.service";
import { USER_QUERY_REPOSITORY_TOKEN, type UserQueryRepository } from "src/modules/user/domain/repositories/user-query-repository.interface";
import { EmailVerifiedApplicationEvent } from "../../application/events/email-verified.event";

@Injectable()
export class SendWelcomeEmailListener {
  constructor(
    private readonly mailService: MailService,
    @Inject(USER_QUERY_REPOSITORY_TOKEN)
    private readonly userQueryRepository: UserQueryRepository

  ) { }

  @OnEvent(EmailVerifiedApplicationEvent.EventName, { async: true })
  async handle(e: EmailVerifiedApplicationEvent): Promise<void> {
    const payload = e.payload;
    const user = await this.userQueryRepository.findByAccountId(payload.accountId);

    await this.mailService.sendWelcomeEmail({
      name: user?.name || payload.email,
      to: payload.email,
    })
  }
}