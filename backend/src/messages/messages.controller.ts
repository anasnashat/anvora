import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import {
  SendMessageDto,
  MessageResponseDto,
  MessageStatusDto,
} from './messages.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { User, Instance } from '@prisma/client';

interface RequestWithApiKey extends Request {
  user: User & { instances: Instance[] };
  instance: Instance;
}

@ApiTags('Messages API')
@Controller('api/v1')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiHeader({ name: 'X-API-Key', description: 'Your API key', required: true })
  @ApiResponse({
    status: 201,
    description: 'Message queued',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Instance not connected' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Quota exceeded' })
  async sendMessage(
    @Req() req: RequestWithApiKey,
    @Body() dto: SendMessageDto,
  ) {
    if (dto.scheduledAt) {
      return this.messagesService.sendScheduledMessage(
        req.user,
        req.instance,
        dto,
        new Date(dto.scheduledAt),
      );
    }
    return this.messagesService.sendMessage(req.user, req.instance, dto);
  }

  @Get('status/:id')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get message delivery status' })
  @ApiHeader({ name: 'X-API-Key', description: 'Your API key', required: true })
  @ApiResponse({
    status: 200,
    description: 'Message status',
    type: MessageStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getStatus(@Req() req: RequestWithApiKey, @Param('id') id: string) {
    return this.messagesService.getMessageStatus(req.user.id, id);
  }

  @Get('messages')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({ summary: 'Get message history' })
  @ApiHeader({ name: 'X-API-Key', description: 'Your API key', required: true })
  @ApiQuery({ name: 'instanceId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Req() req: RequestWithApiKey,
    @Query('instanceId') instanceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagesService.getMessageHistory(
      req.user.id,
      instanceId,
      Math.min(100, Math.max(1, Number.parseInt(limit || '50', 10) || 50)),
    );
  }
}
