import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BaileysService } from '../baileys/baileys.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageJob {
  sessionId: string;
  messageLogId: string;
  to: string;
  message: string;
  mediaType?: string;
  mediaUrl?: string;
}

@Processor('whatsapp-messages', {
  concurrency: 1, // Process one message at a time per worker
  limiter: {
    max: 5, // Maximum 5 messages
    duration: 60000, // Per minute (60000ms)
  },
})
export class MessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagesProcessor.name);
  private readonly MAX_RETRY_DELAY = 300000; // Max 5 minutes

  constructor(
    private readonly baileysService: BaileysService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(
    job: Job<SendMessageJob>,
  ): Promise<{ success: boolean; error?: string }> {
    const { sessionId, messageLogId, to, message, mediaType, mediaUrl } =
      job.data;
    const attemptNumber = job.attemptsMade + 1;

    this.logger.log(
      `Processing message job ${job.id} for session ${sessionId} (attempt ${attemptNumber}/${job.opts.attempts || 3})`,
    );
    this.logger.debug(
      `Target: ${to}, MessageLogId: ${messageLogId}, Media: ${mediaType || 'none'}`,
    );

    try {
      // Update message status to SENDING
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: { status: 'SENDING' },
      });

      // Check if session is connected
      const isSessionConnected = this.baileysService.isConnected(sessionId);
      const session = this.baileysService.getSession(sessionId);

      if (!isSessionConnected || !session) {
        this.logger.error(
          `Session ${sessionId} is not available. Sessions: ${this.baileysService.getActiveSessions().join(', ')}`,
        );

        // If it's not the last attempt, throw to trigger retry
        if (attemptNumber < (job.opts.attempts || 3)) {
          throw new Error(
            `WhatsApp session ${sessionId} is not connected. Will retry.`,
          );
        }

        // Last attempt - mark as failed
        throw new Error(
          `WhatsApp session ${sessionId} is not connected after ${attemptNumber} attempts.`,
        );
      }

      // Add anti-ban random delay
      // Warm-up mode: slower for new sessions (2-5 seconds)
      // Normal mode: 1-3 seconds
      const isWarmup = this.baileysService.isInWarmup(sessionId);
      const minDelay = isWarmup ? 2000 : 1000;
      const maxDelay = isWarmup ? 5000 : 3000;
      const randomDelay =
        Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;

      this.logger.debug(
        `Applying ${isWarmup ? 'warm-up' : 'normal'} delay: ${randomDelay}ms`,
      );
      await this.sleep(randomDelay);

      // Send the message (with or without media)
      let result;
      if (mediaType && mediaUrl) {
        result = await this.baileysService.sendMediaMessage(
          sessionId,
          to,
          message,
          mediaType,
          mediaUrl,
        );
      } else {
        result = await this.baileysService.sendMessage(sessionId, to, message);
      }

      if (result.success) {
        // Update message status to SENT
        await this.prisma.messageLog.update({
          where: { id: messageLogId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        this.logger.log(`Message sent successfully: ${messageLogId}`);
        return { success: true };
      } else {
        throw new Error(result.error || 'Unknown error sending message');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger.error(
        `Failed to send message ${messageLogId} (attempt ${attemptNumber}): ${errorMessage}`,
      );

      // Only update to FAILED on the last attempt
      if (attemptNumber >= (job.opts.attempts || 3)) {
        await this.prisma.messageLog.update({
          where: { id: messageLogId },
          data: {
            status: 'FAILED',
            error: errorMessage,
          },
        });

        this.logger.error(
          `Message ${messageLogId} permanently failed after ${attemptNumber} attempts`,
        );
      } else {
        // Keep status as SENDING for retries
        this.logger.warn(
          `Message ${messageLogId} will be retried (attempt ${attemptNumber}/${job.opts.attempts || 3})`,
        );
      }

      // Re-throw to trigger BullMQ retry mechanism
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SendMessageJob>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SendMessageJob>, error: Error) {
    const attemptNumber = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;

    if (attemptNumber >= maxAttempts) {
      this.logger.error(
        `Job ${job.id} permanently failed after ${attemptNumber} attempts: ${error.message}`,
      );
    } else {
      this.logger.warn(
        `Job ${job.id} failed (attempt ${attemptNumber}/${maxAttempts}), will retry: ${error.message}`,
      );
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<SendMessageJob>) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
