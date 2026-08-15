import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaileysService } from '../baileys/baileys.service';
import { CreateInstanceDto } from './instances.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly baileysService: BaileysService,
  ) {}

  async create(userId: string, dto: CreateInstanceDto) {
    // Generate unique session ID
    const sessionId = `session_${uuidv4()}`;

    // Create instance in database
    const instance = await this.prisma.instance.create({
      data: {
        name: dto.name,
        userId,
        sessionId,
        status: 'DISCONNECTED',
      },
    });

    return instance;
  }

  async findAll(userId: string) {
    return this.prisma.instance.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, instanceId: string) {
    const instance = await this.prisma.instance.findFirst({
      where: {
        id: instanceId,
        userId,
      },
    });

    if (!instance) {
      throw new NotFoundException('Instance not found');
    }

    return instance;
  }

  async connect(userId: string, instanceId: string) {
    const instance = await this.findOne(userId, instanceId);

    // Initialize WhatsApp session (will emit QR code via WebSocket)
    // Force reset the session to ensure a fresh start/new QR code
    await this.baileysService.initSession(
      instance.sessionId,
      instance.id,
      true,
    );

    return { message: 'Connecting... Listen for QR code via WebSocket' };
  }

  async disconnect(userId: string, instanceId: string) {
    const instance = await this.findOne(userId, instanceId);

    // Remove WhatsApp session
    await this.baileysService.removeSession(instance.sessionId);

    // Update database
    await this.prisma.instance.update({
      where: { id: instanceId },
      data: { status: 'DISCONNECTED' },
    });

    return { message: 'Disconnected successfully' };
  }

  async remove(userId: string, instanceId: string) {
    console.log(
      `Attempting to remove instance: ${instanceId} for user ${userId}`,
    );
    try {
      const instance = await this.findOne(userId, instanceId);
      console.log(`Instance found: ${instance.sessionId}`);

      // Remove WhatsApp session if exists
      try {
        await this.baileysService.removeSession(instance.sessionId);
        console.log(`Session removed: ${instance.sessionId}`);
      } catch (sessionError) {
        console.error(
          `Error removing session ${instance.sessionId}:`,
          sessionError,
        );
      }

      // Delete from database
      await this.prisma.instance.delete({
        where: { id: instanceId },
      });
      console.log(`Database record deleted: ${instanceId}`);
    } catch (error) {
      console.error(`Error in remove instance:`, error);
      // If instance not found, consider it already deleted (idempotent)
      if (error instanceof NotFoundException) {
        console.log(`Instance not found, considering deleted`);
        return { message: 'Instance deleted successfully' };
      }
      throw error;
    }

    return { message: 'Instance deleted successfully' };
  }

  async getStatus(userId: string, instanceId: string) {
    const instance = await this.findOne(userId, instanceId);

    return {
      id: instance.id,
      name: instance.name,
      status: instance.status,
      phoneNumber: instance.phoneNumber,
      isConnected: this.baileysService.isConnected(instance.sessionId),
    };
  }
}
