import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactResponseDto,
} from './contacts.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({
    status: 201,
    description: 'Contact created',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Contact with this phone already exists',
  })
  async create(@Req() req: RequestWithUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contacts for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of contacts',
    type: [ContactResponseDto],
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: [String],
    description: 'Filter by tags',
  })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('tags') tags?: string | string[],
  ) {
    const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : undefined;
    return this.contactsService.findAll(req.user.id, tagArray);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific contact' })
  @ApiResponse({
    status: 200,
    description: 'Contact details',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.contactsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({
    status: 200,
    description: 'Contact updated',
    type: ContactResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  @ApiResponse({ status: 409, description: 'Phone number already in use' })
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.contactsService.remove(req.user.id, id);
  }
}
