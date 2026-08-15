import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    example: '5491155554444',
    description: 'Phone number with country code',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7,15}$/, {
    message: 'to must be 7-15 digits including country code',
  })
  to: string;

  @ApiProperty({ example: 'Hello from Anvora!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message: string;

  @ApiPropertyOptional({
    description: 'Instance ID (uses first connected if not provided)',
  })
  @IsUUID()
  @IsOptional()
  instanceId?: string;

  @ApiPropertyOptional({
    enum: ['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'],
    description: 'Media type',
  })
  @IsEnum(['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'])
  @IsOptional()
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';

  @ApiPropertyOptional({
    example: '/uploads/1234567890-image.jpg',
    description: 'Media file URL',
  })
  @IsString()
  @Matches(/^\/uploads\/[A-Za-z0-9._-]+$/)
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: '2026-08-14T18:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['QUEUED', 'SENDING', 'SENT', 'FAILED'] })
  status: string;

  @ApiProperty()
  message: string;
}

export class MessageStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  to: string;

  @ApiProperty({ enum: ['QUEUED', 'SENDING', 'SENT', 'FAILED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  sentAt?: Date;
}
