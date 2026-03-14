import { AccountRegisteredEvent } from "src/modules/auth/domain/events";
import { USER_REPOSITORY_TOKEN, type UserRepository } from "../../domain/repositories/user-repository.interface";
import { OnEvent } from "@nestjs/event-emitter";
import { User } from "../../domain/entity/user.entity";
import { Inject, Logger } from "@nestjs/common";

export class CreateUserOnAccountRegisteredListener {

  private readonly logger = new Logger(CreateUserOnAccountRegisteredListener.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepository
  ) { }

  @OnEvent(AccountRegisteredEvent.EventName, { async: true })
  async handle(e: AccountRegisteredEvent): Promise<void> {
    const payload = e.payload;

    // Create User Profile
    const user = User.create({
      accountId: payload.accountId,
      name: payload.name,
    })

    await this.userRepository.save(user);

    this.logger.log(`User profile created for Account ID: ${payload.accountId}`);
  }
}