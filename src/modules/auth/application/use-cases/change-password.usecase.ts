import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACCOUNT_REPOSITORY_TOKEN, type AccountRepository } from '../../domain/repositories/account-repository.interface';
import { AccountId, Password } from '../../domain/value-objects';
import { PASSWORD_HASHER_TOKEN, type PasswordHasher } from '../interfaces/password-hasher.interface';
import { AccountNotFoundError, InvalidCredentialsError } from '../errors';
import { PasswordChangedApplicationEvent } from '../events/password-changed.event';

interface ChangePasswordCommand {
  accountId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePasswordUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY_TOKEN)
    private readonly accountRepository: AccountRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: PasswordHasher,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(command: ChangePasswordCommand): Promise<void> {
    const account = await this.accountRepository.findById(AccountId.fromString(command.accountId));
    if (!account) {
      throw new AccountNotFoundError(command.accountId);
    }

    account.assertCanChangePassword();

    const isCurrentPasswordValid = await this.passwordHasher.compare(
      command.currentPassword,
      account.password!.getValue(),
    );
    if (!isCurrentPasswordValid) {
      throw new InvalidCredentialsError('Current password is incorrect.');
    }

    Password.validateRaw(command.newPassword);
    const hashedNewPassword = await this.passwordHasher.hash(command.newPassword);

    account.changePassword(hashedNewPassword);

    await this.accountRepository.save(account);

    this.eventEmitter.emit(
      PasswordChangedApplicationEvent.EventName,
      new PasswordChangedApplicationEvent({
        accountId: account.id.getValue(),
        email: account.email.getValue(),
        changedAt: new Date(),
      }),
    );
  }
}
