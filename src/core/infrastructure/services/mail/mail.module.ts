import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MAIL_QUEUE_NAME } from './constants/mail-queue.constants';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';
import { MailerModule } from '../../mailer/mailer.module';

@Module({
  imports: [
    MailerModule,
    BullModule.registerQueue({
      name: MAIL_QUEUE_NAME,
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule { }