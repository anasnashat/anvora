import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstanceDto {
  @ApiProperty({ example: 'Marketing Phone' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class InstanceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty({ enum: ['CONNECTING', 'CONNECTED', 'DISCONNECTED'] })
  status: string;

  @ApiPropertyOptional()
  phoneNumber?: string;

  @ApiProperty()
  createdAt: Date;
}
