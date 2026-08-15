import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

interface SessionData {
  socket: WASocket;
  createdAt: Date;
  warmupUntil: Date; // Warm-up period for new sessions
  reconnectAttempts?: number; // Track reconnection attempts
  lastReconnectTime?: Date; // Track last reconnection attempt
}

@Injectable()
export class BaileysService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysService.name);
  private sessions: Map<string, SessionData> = new Map();
  private readonly authBasePath: string;
  private readonly WARMUP_HOURS = 24; // New sessions are in warm-up for 24 hours
  private readonly MAX_RECONNECT_ATTEMPTS = 5; // Maximum reconnection attempts
  private readonly BASE_RECONNECT_DELAY = 5000; // Base delay: 5 seconds

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {
    this.authBasePath = process.env.BAILEYS_AUTH_PATH || './auth_info_baileys';
    // Ensure the base auth directory exists
    if (!fs.existsSync(this.authBasePath)) {
      fs.mkdirSync(this.authBasePath, { recursive: true });
    }
  }

  async onModuleInit() {
    // Auto-restore sessions that were previously connected
    this.logger.log('Restoring WhatsApp sessions on startup...');

    try {
      // Get all instances marked as CONNECTED from the database
      const connectedInstances = await this.prisma.instance.findMany({
        where: { status: 'CONNECTED' },
      });

      this.logger.log(
        `Found ${connectedInstances.length} connected instances to restore`,
      );

      for (const instance of connectedInstances) {
        const sessionPath = path.join(this.authBasePath, instance.sessionId);

        // Only restore if auth files exist on disk
        if (fs.existsSync(sessionPath)) {
          this.logger.log(
            `Restoring session: ${instance.sessionId} for instance ${instance.name}`,
          );
          try {
            await this.initSession(instance.sessionId, instance.id);
          } catch (error) {
            this.logger.error(
              `Failed to restore session ${instance.sessionId}: ${error}`,
            );
            // Mark as disconnected if restore fails
            await this.prisma.instance.update({
              where: { id: instance.id },
              data: { status: 'DISCONNECTED' },
            });
          }
        } else {
          this.logger.warn(
            `Auth files not found for session ${instance.sessionId}, marking as disconnected`,
          );
          await this.prisma.instance.update({
            where: { id: instance.id },
            data: { status: 'DISCONNECTED' },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error restoring sessions: ${error}`);
    }
  }

  async onModuleDestroy() {
    // Gracefully close all sessions
    for (const [sessionId, sessionData] of this.sessions) {
      this.logger.log(`Closing session: ${sessionId}`);
      sessionData.socket.end(undefined);
    }
    this.sessions.clear();
  }

  /**
   * Get an active socket for a session
   */
  getSession(sessionId: string): WASocket | null {
    const session = this.sessions.get(sessionId);
    return session?.socket || null;
  }

  /**
   * Check if a session is in warm-up mode (slower sending for new sessions)
   */
  isInWarmup(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return true; // Treat unknown sessions as in warmup
    return new Date() < session.warmupUntil;
  }

  /**
   * Check if a session is connected
   */
  isConnected(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.socket?.user !== undefined;
  }

  /**
   * Initialize a new WhatsApp session
   * Returns QR code events via EventEmitter
   */
  async initSession(
    sessionId: string,
    instanceId: string,
    force = false,
  ): Promise<void> {
    const sessionPath = path.join(this.authBasePath, sessionId);

    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      if (force) {
        this.logger.log(`Force resetting session ${sessionId}`);
        await this.removeSession(sessionId);
      } else {
        this.logger.warn(`Session ${sessionId} already exists, reusing...`);
        return;
      }
    } else if (force && fs.existsSync(sessionPath)) {
      // If force is true and files exist but not in memory, clear files to ensure fresh start
      this.logger.log(`Force clearing old auth files for session ${sessionId}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    try {
      // Setup multi-file auth state
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      // Create a logger proxy that satisfies Baileys requirements
      const loggerProxy = {
        trace: (msg: any) => this.logger.verbose(msg),
        debug: (msg: any) => this.logger.debug(msg),
        info: (msg: any) => this.logger.log(msg),
        warn: (msg: any) => this.logger.warn(msg),
        error: (msg: any) => this.logger.error(msg),
        child: () => loggerProxy,
      };

      // Create the socket
      const sock = makeWASocket({
        version,
        logger: loggerProxy as any,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, loggerProxy as any),
        },
        printQRInTerminal: false, // We'll handle QR ourselves
        generateHighQualityLinkPreview: true,
        // Add browser info to appear more legitimate
        browser: ['Anvora', 'Chrome', '120.0.0'],
      });

      // Calculate warm-up end time
      const warmupUntil = new Date();
      warmupUntil.setHours(warmupUntil.getHours() + this.WARMUP_HOURS);

      // Store the session
      this.sessions.set(sessionId, {
        socket: sock,
        createdAt: new Date(),
        warmupUntil,
      });

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Emit QR code for frontend
        if (qr) {
          this.logger.log(`QR code generated for session: ${sessionId}`);
          this.eventEmitter.emit('qr.generated', { sessionId, qr });
        }

        if (connection === 'close') {
          const reason: number | undefined = (lastDisconnect?.error as Boom)
            ?.output?.statusCode;
          const shouldReconnect = reason !== Number(DisconnectReason.loggedOut);

          this.logger.warn(
            `Session ${sessionId} disconnected. Reason: ${reason}. Reconnect: ${shouldReconnect}`,
          );

          // Update instance status in database
          try {
            await this.prisma.instance.update({
              where: { id: instanceId },
              data: { status: 'DISCONNECTED' },
            });
          } catch (error) {
            // Ignore if instance not found (already deleted)
            if (error.code !== 'P2025') {
              this.logger.error(
                `Failed to update instance status: ${error.message}`,
              );
            }
          }

          // Get current session data for reconnection tracking
          const sessionData = this.sessions.get(sessionId);
          const reconnectAttempts = (sessionData?.reconnectAttempts || 0) + 1;

          // Remove from memory
          this.sessions.delete(sessionId);

          // Emit disconnection event
          this.eventEmitter.emit('session.disconnected', { sessionId, reason });

          if (
            shouldReconnect &&
            reconnectAttempts <= this.MAX_RECONNECT_ATTEMPTS
          ) {
            // Exponential backoff: 5s, 10s, 20s, 40s, 80s
            const delay =
              this.BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
            this.logger.log(
              `Scheduling reconnection attempt ${reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS} for ${sessionId} in ${delay}ms`,
            );

            setTimeout(async () => {
              try {
                await this.initSession(sessionId, instanceId);
                // Update reconnection tracking
                const newSession = this.sessions.get(sessionId);
                if (newSession) {
                  newSession.reconnectAttempts = reconnectAttempts;
                  newSession.lastReconnectTime = new Date();
                }
              } catch (error) {
                this.logger.error(
                  `Reconnection attempt ${reconnectAttempts} failed for ${sessionId}: ${error.message}`,
                );
              }
            }, delay);
          } else if (shouldReconnect) {
            this.logger.error(
              `Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for ${sessionId}. Giving up.`,
            );
            this.eventEmitter.emit('session.reconnect.failed', { sessionId });
          }
        }

        if (connection === 'open') {
          this.logger.log(`Session ${sessionId} connected successfully`);

          // Get the phone number from the socket
          const phoneNumber = sock.user?.id?.split(':')[0] || undefined;

          // Reset reconnection tracking on successful connection
          const sessionData = this.sessions.get(sessionId);
          if (sessionData) {
            sessionData.reconnectAttempts = 0;
            sessionData.lastReconnectTime = undefined;
          }

          // Update instance status in database
          await this.prisma.instance.update({
            where: { id: instanceId },
            data: {
              status: 'CONNECTED',
              phoneNumber,
            },
          });

          // Emit connection event
          this.eventEmitter.emit('session.connected', {
            sessionId,
            phoneNumber,
          });
        }
      });

      // Save credentials on update
      sock.ev.on('creds.update', saveCreds);

      // Update instance to connecting status
      try {
        await this.prisma.instance.update({
          where: { id: instanceId },
          data: { status: 'CONNECTING' },
        });
      } catch (error) {
        if (error.code === 'P2025') {
          this.logger.warn(
            `Instance ${instanceId} not found during initSession (deleted?). Aborting.`,
          );
          this.sessions.delete(sessionId);
          return;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to initialize session ${sessionId}:`, error);
      this.sessions.delete(sessionId);
      throw error;
    }
  }

  /**
   * Disconnect and remove a session
   */
  async removeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      session.socket.end(undefined);
      this.sessions.delete(sessionId);
    }

    // Remove session files
    const sessionPath = path.join(this.authBasePath, sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
    }

    this.logger.log(`Session ${sessionId} removed`);
  }

  /**
   * Send a text message
   */
  async sendMessage(
    sessionId: string,
    to: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      // Format the phone number (ensure it has @s.whatsapp.net suffix)
      const formattedNumber = this.formatPhoneNumber(to);

      // Check if the number exists on WhatsApp
      const result = await session.socket.onWhatsApp(
        formattedNumber.split('@')[0],
      );
      const exists = result?.[0];

      if (!exists?.exists) {
        return { success: false, error: 'Number not registered on WhatsApp' };
      }

      // Send the message
      const sendResult = await session.socket.sendMessage(formattedNumber, {
        text: message,
      });

      return { success: true, messageId: sendResult?.key?.id ?? undefined };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error}`);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send a media message (image, video, document, audio)
   */
  async sendMediaMessage(
    sessionId: string,
    to: string,
    caption: string,
    mediaType: string,
    mediaUrl: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      // Format the phone number
      const formattedNumber = this.formatPhoneNumber(to);

      // Check if the number exists on WhatsApp
      const result = await session.socket.onWhatsApp(
        formattedNumber.split('@')[0],
      );
      const exists = result?.[0];

      if (!exists?.exists) {
        return { success: false, error: 'Number not registered on WhatsApp' };
      }

      if (!/^\/uploads\/[A-Za-z0-9._-]+$/.test(mediaUrl)) {
        return { success: false, error: 'Invalid media path' };
      }

      const mediaPath = path.join(
        process.cwd(),
        'uploads',
        path.basename(mediaUrl),
      );

      // Check if file exists
      if (!fs.existsSync(mediaPath)) {
        return { success: false, error: 'Media file not found' };
      }

      // Prepare message content based on media type
      const messageContent: any = { caption };

      switch (mediaType) {
        case 'IMAGE':
          messageContent.image = { url: mediaPath };
          break;
        case 'VIDEO':
          messageContent.video = { url: mediaPath };
          break;
        case 'DOCUMENT':
          messageContent.document = { url: mediaPath };
          messageContent.fileName = path.basename(mediaPath);
          break;
        case 'AUDIO':
          messageContent.audio = { url: mediaPath };
          messageContent.mimetype = 'audio/mp4';
          break;
        default:
          return { success: false, error: 'Unsupported media type' };
      }

      // Send the media message
      const sendResult = await session.socket.sendMessage(
        formattedNumber,
        messageContent,
      );

      return { success: true, messageId: sendResult?.key?.id ?? undefined };
    } catch (error) {
      this.logger.error(`Failed to send media message: ${error}`);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Format phone number to WhatsApp JID format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add @s.whatsapp.net suffix if not present
    if (!cleaned.includes('@')) {
      cleaned = `${cleaned}@s.whatsapp.net`;
    }

    return cleaned;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get count of active instances for health checks
   */
  getActiveInstanceCount(): number {
    return this.sessions.size;
  }
}
