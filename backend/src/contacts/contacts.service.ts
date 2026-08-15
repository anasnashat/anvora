import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto } from './contacts.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateContactDto) {
    // Check if contact with same phone already exists for this user
    const existing = await this.prisma.contact.findUnique({
      where: {
        userId_phone: {
          userId,
          phone: dto.phone,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Contact with this phone number already exists',
      );
    }

    return this.prisma.contact.create({
      data: {
        ...dto,
        userId,
        customAttributes: dto.customAttributes || undefined,
      },
    });
  }

  async findAll(userId: string, tags?: string[]) {
    const where: any = { userId };

    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    return this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        userId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(userId: string, contactId: string, dto: UpdateContactDto) {
    // Verify contact belongs to user
    await this.findOne(userId, contactId);

    // If phone is being updated, check for conflicts
    if (dto.phone) {
      const existing = await this.prisma.contact.findUnique({
        where: {
          userId_phone: {
            userId,
            phone: dto.phone,
          },
        },
      });

      if (existing && existing.id !== contactId) {
        throw new ConflictException(
          'Another contact with this phone number already exists',
        );
      }
    }

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...dto,
        customAttributes:
          dto.customAttributes !== undefined ? dto.customAttributes : undefined,
      },
    });
  }

  async remove(userId: string, contactId: string) {
    // Verify contact belongs to user
    await this.findOne(userId, contactId);

    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    return { message: 'Contact deleted successfully' };
  }
}
