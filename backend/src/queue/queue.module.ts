import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MessagesProcessor } from './messages.processor';
import { QueueMonitorService } from './queue-monitor.service';
import { BaileysModule } from '../baileys/baileys.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'whatsapp-messages',
      defaultJobOptions: {
        removeOnComplete: 1000, // Keep last 1000 completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BaileysModule,
  ],
  providers: [MessagesProcessor, QueueMonitorService],
  exports: [BullModule, QueueMonitorService],
})
export class QueueModule {}
