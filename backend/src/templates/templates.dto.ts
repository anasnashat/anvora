import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Welcome Message' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Hello {{name}}, welcome to {{company}}!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  content: string;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Welcome Message Updated' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Hi {{name}}, welcome to {{company}}!' })
  @IsString()
  @IsOptional()
  @MaxLength(4096)
  content?: string;
}

export class SendWithTemplateDto {
  @ApiProperty({ example: '5491155554444' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ example: 'template-id-here' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    example: { name: 'John', company: 'Acme Corp' },
    description: 'Variables to substitute in template',
  })
  @IsOptional()
  variables?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instanceId?: string;
}
