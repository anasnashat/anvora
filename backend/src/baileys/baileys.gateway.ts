import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as QRCode from 'qrcode';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  namespace: '/whatsapp',
})
export class BaileysGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BaileysGateway.name);

  // Map to track which clients are listening for which session
  private clientSessionMap: Map<string, string> = new Map();
  private clientUserMap: Map<string, string> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('Missing token');
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(token);
      if (payload.type !== 'access') throw new Error('Invalid token type');
      this.clientUserMap.set(client.id, payload.sub);
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientSessionMap.delete(client.id);
    this.clientUserMap.delete(client.id);
  }

  /**
   * Client subscribes to a specific session's events
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const userId = this.clientUserMap.get(client.id);
    if (!userId || typeof data?.sessionId !== 'string') {
      throw new WsException('Unauthorized');
    }

    const instance = await this.prisma.instance.findFirst({
      where: { sessionId: data.sessionId, userId },
      select: { id: true },
    });
    if (!instance) throw new WsException('Session not found');

    this.logger.log(
      `Client ${client.id} subscribed to session: ${data.sessionId}`,
    );
    this.clientSessionMap.set(client.id, data.sessionId);
    await client.join(`session:${data.sessionId}`);
    return { success: true };
  }

  /**
   * Handle QR code generation event from BaileysService
   */
  @OnEvent('qr.generated')
  async handleQrGenerated(payload: { sessionId: string; qr: string }) {
    try {
      // Convert QR string to base64 data URL
      const qrDataUrl = await QRCode.toDataURL(payload.qr, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      // Emit to all clients listening to this session
      this.server.to(`session:${payload.sessionId}`).emit('qr', {
        sessionId: payload.sessionId,
        qrCode: qrDataUrl,
      });

      this.logger.log(`QR code emitted for session: ${payload.sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Handle session connected event
   */
  @OnEvent('session.connected')
  handleSessionConnected(payload: { sessionId: string; phoneNumber: string }) {
    this.server.to(`session:${payload.sessionId}`).emit('connected', {
      sessionId: payload.sessionId,
      phoneNumber: payload.phoneNumber,
    });
    this.logger.log(`Session connected event emitted: ${payload.sessionId}`);
  }

  /**
   * Handle session disconnected event
   */
  @OnEvent('session.disconnected')
  handleSessionDisconnected(payload: { sessionId: string; reason: number }) {
    this.server.to(`session:${payload.sessionId}`).emit('disconnected', {
      sessionId: payload.sessionId,
      reason: payload.reason,
    });
    this.logger.log(`Session disconnected event emitted: ${payload.sessionId}`);
  }
}
