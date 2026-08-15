import { Module } from '@nestjs/common';
import { BaileysService } from './baileys.service';
import { BaileysGateway } from './baileys.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [BaileysService, BaileysGateway],
  exports: [BaileysService],
})
export class BaileysModule {}
