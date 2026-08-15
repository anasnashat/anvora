import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InstancesService } from './instances.service';
import { CreateInstanceDto, InstanceResponseDto } from './instances.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Instances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new WhatsApp instance' })
  @ApiResponse({
    status: 201,
    description: 'Instance created',
    type: InstanceResponseDto,
  })
  async create(@Req() req: RequestWithUser, @Body() dto: CreateInstanceDto) {
    return this.instancesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all instances for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of instances',
    type: [InstanceResponseDto],
  })
  async findAll(@Req() req: RequestWithUser) {
    return this.instancesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific instance' })
  @ApiResponse({
    status: 200,
    description: 'Instance details',
    type: InstanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.instancesService.findOne(req.user.id, id);
  }

  @Post(':id/connect')
  @ApiOperation({
    summary: 'Connect WhatsApp instance (initiates QR code generation)',
  })
  @ApiResponse({ status: 200, description: 'Connection initiated' })
  async connect(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.instancesService.connect(req.user.id, id);
  }

  @Post(':id/disconnect')
  @ApiOperation({ summary: 'Disconnect WhatsApp instance' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  async disconnect(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.instancesService.disconnect(req.user.id, id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get instance connection status' })
  async getStatus(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.instancesService.getStatus(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a WhatsApp instance' })
  @ApiResponse({ status: 200, description: 'Instance deleted' })
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.instancesService.remove(req.user.id, id);
  }
}
