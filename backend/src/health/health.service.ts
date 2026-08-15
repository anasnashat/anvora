import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaileysService } from '../baileys/baileys.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  info?: Record<string, any>;
  error?: Record<string, any>;
  details: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('messages') private readonly messagesQueue: Queue,
    private readonly baileysService: BaileysService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      baileys: await this.checkBaileys(),
    };

    const hasError = Object.values(checks).some(
      (check) => check.status === 'down',
    );

    return {
      status: hasError ? 'error' : 'ok',
      info: hasError ? undefined : checks,
      error: hasError ? checks : undefined,
      details: checks,
    };
  }

  async checkReadiness(): Promise<{ status: string }> {
    const health = await this.check();
    if (health.status === 'error') {
      throw new Error('Application is not ready');
    }
    return { status: 'ready' };
  }

  private async checkDatabase(): Promise<{
    status: string;
    responseTime?: number;
  }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      return { status: 'up', responseTime };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<{ status: string; jobs?: number }> {
    try {
      const jobCounts = await this.messagesQueue.getJobCounts();
      const totalJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0);
      return { status: 'up', jobs: totalJobs };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'down' };
    }
  }

  private checkBaileys(): { status: string; instances?: number } {
    try {
      // Get count of active instances from BaileysService
      const instanceCount = this.baileysService.getActiveInstanceCount();
      return { status: 'up', instances: instanceCount };
    } catch (error) {
      this.logger.error('Baileys health check failed', error);
      return { status: 'down' };
    }
  }
}
