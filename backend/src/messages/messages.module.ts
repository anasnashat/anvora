import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { QueueModule } from '../queue/queue.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [QueueModule, TemplatesModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
