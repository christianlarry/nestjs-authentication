import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  IMailJobData,
  INewLoginNotificationData,
  IPasswordChangedEmailData,
  IResetPasswordEmailData,
  ISuspiciousActivityData,
  IVerificationEmailData,
  IWelcomeEmailData,
} from './interfaces/mail-job-data.interface';
import { MAIL_JOB_OPTIONS, MAIL_QUEUE_NAME } from './constants/mail-queue.constants';
import { MailJobPriority, MailJobType } from './enums/mail-job.enum';

/**
 * Mail Service
 * Bertanggung jawab untuk menambahkan email jobs ke queue
 * Menggunakan BullMQ untuk asynchronous processing
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE_NAME)
    private readonly mailQueue: Queue<IMailJobData>,
  ) { }

  /**
   * Send verification email
   * Digunakan setelah user registrasi
   */
  async sendVerificationEmail(
    data: IVerificationEmailData,
  ): Promise<void> {
    this.logger.log(`Queueing verification email to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.VERIFICATION_EMAIL,
        {
          to: data.to,
          subject: 'Verify your Keramik Store account',
          type: MailJobType.VERIFICATION_EMAIL,
          context: data,
        },
        {
          priority: MailJobPriority.HIGH, // Important but not critical, Slight impact on Performance
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`Verification email queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue verification email for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send reset password email
   * Digunakan untuk forgot password flow
   */
  async sendResetPasswordEmail(
    data: IResetPasswordEmailData,
  ): Promise<void> {
    this.logger.log(`Queueing reset password email to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.RESET_PASSWORD,
        {
          to: data.to,
          subject: 'Reset your Keramik Store password',
          type: MailJobType.RESET_PASSWORD,
          context: data,
        },
        {
          priority: MailJobPriority.HIGH,
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`Reset password email queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue reset password email for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send password changed confirmation email
   * Digunakan setelah user berhasil mengubah password
   */
  async sendPasswordChangedEmail(
    data: IPasswordChangedEmailData,
  ): Promise<void> {
    this.logger.log(`Queueing password changed email to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.PASSWORD_CHANGED,
        {
          to: data.to,
          subject: 'Your Keramik Store password has been changed',
          type: MailJobType.PASSWORD_CHANGED,
          context: data,
        },
        {
          priority: MailJobPriority.HIGH,
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`Password changed email queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue password changed email for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send welcome email
   * Digunakan setelah email verification berhasil
   */
  async sendWelcomeEmail(data: IWelcomeEmailData): Promise<void> {
    this.logger.log(`Queueing welcome email to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.WELCOME,
        {
          to: data.to,
          subject: 'Welcome to Keramik Store!',
          type: MailJobType.WELCOME,
          context: data,
        },
        {
          priority: MailJobPriority.NORMAL,
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`Welcome email queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue welcome email for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send new login notification
   * Digunakan ketika detect login dari device/location baru
   */
  async sendNewLoginNotification(
    data: INewLoginNotificationData,
  ): Promise<void> {
    this.logger.log(`Queueing new login notification to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.NEW_LOGIN_NOTIFICATION,
        {
          to: data.to,
          subject: 'New login to your Keramik Store account',
          type: MailJobType.NEW_LOGIN_NOTIFICATION,
          context: data,
        },
        {
          priority: MailJobPriority.NORMAL,
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`New login notification queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue new login notification for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send suspicious activity alert
   * Digunakan ketika detect aktivitas mencurigakan
   */
  async sendSuspiciousActivityAlert(
    data: ISuspiciousActivityData,
  ): Promise<void> {
    this.logger.log(`Queueing suspicious activity alert to ${data.to}`);

    try {
      await this.mailQueue.add(
        MailJobType.SUSPICIOUS_ACTIVITY,
        {
          to: data.to,
          subject: '🚨 Suspicious activity detected on your Keramik Store account',
          type: MailJobType.SUSPICIOUS_ACTIVITY,
          context: data,
        },
        {
          priority: MailJobPriority.CRITICAL, // Highest priority
          attempts: MAIL_JOB_OPTIONS.MAX_ATTEMPTS,
          backoff: {
            type: MAIL_JOB_OPTIONS.BACKOFF_TYPE,
            delay: MAIL_JOB_OPTIONS.BACKOFF_DELAY,
          },
          removeOnComplete: MAIL_JOB_OPTIONS.REMOVE_ON_COMPLETE,
          removeOnFail: MAIL_JOB_OPTIONS.REMOVE_ON_FAIL,
        },
      );

      this.logger.log(`Suspicious activity alert queued successfully for ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue suspicious activity alert for ${data.to}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   * Useful untuk monitoring
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.mailQueue.getWaitingCount(),
      this.mailQueue.getActiveCount(),
      this.mailQueue.getCompletedCount(),
      this.mailQueue.getFailedCount(),
      this.mailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Clean completed jobs
   * Untuk maintenance
   */
  async cleanCompletedJobs(olderThanMs: number = 24 * 60 * 60 * 1000) {
    this.logger.log(`Cleaning completed jobs older than ${olderThanMs}ms`);
    await this.mailQueue.clean(olderThanMs, 100, 'completed');
  }

  /**
   * Clean failed jobs
   * Untuk maintenance
   */
  async cleanFailedJobs(olderThanMs: number = 7 * 24 * 60 * 60 * 1000) {
    this.logger.log(`Cleaning failed jobs older than ${olderThanMs}ms`);
    await this.mailQueue.clean(olderThanMs, 100, 'failed');
  }

  /**
   * Retry failed jobs
   * Untuk maintenance
   */
  async retryFailedJobs() {
    this.logger.log(`Retrying all failed jobs`);
    const failedJobs = await this.mailQueue.getFailed();
    for (const job of failedJobs) {
      await job.retry();
      this.logger.log(`Retried failed job ${job.id}`);
    }
  }
}