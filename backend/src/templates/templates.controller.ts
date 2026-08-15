import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, UpdateTemplateDto } from './templates.dto';
import { User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Templates')
@Controller('templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  create(
    @Req() req: RequestWithUser,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    return this.templatesService.create(req.user.id, createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  findAll(@Req() req: RequestWithUser) {
    return this.templatesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.templatesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(req.user.id, id, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.templatesService.remove(req.user.id, id);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview template with variables' })
  preview(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() variables: Record<string, string>,
  ) {
    return this.templatesService.preview(req.user.id, id, variables);
  }
}
