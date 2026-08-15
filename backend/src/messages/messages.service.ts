import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './messages.dto';
import { SendMessageJob } from '../queue/messages.processor';
import { Instance, MessageLog, User } from '@prisma/client';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectQueue('whatsapp-messages')
    private messageQueue: Queue<SendMessageJob>,
    private readonly prisma: PrismaService,
    private readonly templatesService: TemplatesService,
  ) {}

  async sendMessage(
    user: User,
    instance: Instance | undefined,
    dto: SendMessageDto,
  ) {
    return this.queueMessage(
      user,
      instance,
      dto,
      Math.floor(Math.random() * 1000),
    );
  }

  async getMessageStatus(userId: string, messageId: string) {
    const messageLog = await this.prisma.messageLog.findFirst({
      where: {
        id: messageId,
        instance: {
          userId,
        },
      },
    });

    if (!messageLog) {
      throw new NotFoundException('Message not found');
    }

    return {
      id: messageLog.id,
      to: messageLog.to,
      status: messageLog.status,
      createdAt: messageLog.createdAt,
      sentAt: messageLog.sentAt,
    };
  }

  async getMessageHistory(userId: string, instanceId?: string, limit = 50) {
    const whereClause: any = {
      instance: {
        userId,
      },
    };

    if (instanceId) {
      whereClause.instanceId = instanceId;
    }

    return this.prisma.messageLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        instance: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  /**
   * Send message using a template
   */
  async sendWithTemplate(
    user: User,
    instance: Instance | undefined,
    templateId: string,
    to: string,
    variables: Record<string, string>,
  ) {
    // Get template
    const template = await this.templatesService.findOne(user.id, templateId);

    // Substitute variables
    const message = this.templatesService.substituteVariables(
      template.content,
      variables,
    );

    // Send message using regular flow
    return this.sendMessage(user, instance, { to, message });
  }

  /**
   * Send scheduled message
   */
  async sendScheduledMessage(
    user: User,
    instance: Instance | undefined,
    dto: SendMessageDto,
    scheduledAt: Date,
  ) {
    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    return this.queueMessage(user, instance, dto, delay, scheduledAt);
  }

  private async queueMessage(
    user: User,
    instance: Instance | undefined,
    dto: SendMessageDto,
    delay: number,
    scheduledAt?: Date,
  ) {
    if (!instance || instance.status !== 'CONNECTED') {
      throw new BadRequestException('WhatsApp instance is not connected');
    }

    const reservation = await this.prisma.user.updateMany({
      where: { id: user.id, messagesSent: { lt: user.planLimit } },
      data: { messagesSent: { increment: 1 } },
    });
    if (!reservation.count) {
      throw new ForbiddenException('Message quota exceeded');
    }

    let messageLog: MessageLog | undefined;
    try {
      messageLog = await this.prisma.messageLog.create({
        data: {
          instanceId: instance.id,
          to: dto.to,
          content: dto.message,
          mediaType: dto.mediaType || null,
          mediaUrl: dto.mediaUrl || null,
          scheduledAt,
          status: 'QUEUED',
        },
      });

      await this.messageQueue.add(
        'send-whatsapp',
        {
          sessionId: instance.sessionId,
          messageLogId: messageLog.id,
          to: dto.to,
          message: dto.message,
          mediaType: dto.mediaType,
          mediaUrl: dto.mediaUrl,
        },
        { delay, removeOnComplete: true, removeOnFail: false },
      );
    } catch (error) {
      if (messageLog) {
        await this.prisma.messageLog.update({
          where: { id: messageLog.id },
          data: { status: 'FAILED', error: 'Failed to enqueue message' },
        });
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { messagesSent: { decrement: 1 } },
      });
      throw error;
    }

    return {
      id: messageLog.id,
      status: 'QUEUED',
      scheduledAt,
      message: scheduledAt
        ? 'Message scheduled for delivery'
        : 'Message queued for delivery',
    };
  }
}
