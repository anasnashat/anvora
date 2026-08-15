import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BaileysModule } from '../baileys/baileys.module';

@Module({
  imports: [
    PrismaModule,
    BaileysModule,
    BullModule.registerQueue({
      name: 'messages',
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
