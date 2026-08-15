import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { QueueMonitorService } from './queue-monitor.service';

@ApiTags('Queue Monitoring')
@Controller('queue')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueueController {
  constructor(private readonly queueMonitor: QueueMonitorService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get queue metrics and statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved',
    schema: {
      example: {
        name: 'whatsapp-messages',
        stats: {
          waiting: 5,
          active: 2,
          completed: 1234,
          failed: 3,
          delayed: 0,
          paused: 0,
          total: 1244,
        },
        isPaused: false,
        workers: 1,
      },
    },
  })
  async getMetrics() {
    return this.queueMonitor.getQueueMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check queue health status' })
  @ApiResponse({
    status: 200,
    description: 'Queue health status',
    schema: {
      example: {
        healthy: true,
        issues: [],
        metrics: {
          name: 'whatsapp-messages',
          stats: {
            waiting: 5,
            active: 2,
            completed: 1234,
            failed: 3,
            delayed: 0,
            paused: 0,
            total: 1244,
          },
          isPaused: false,
          workers: 1,
        },
      },
    },
  })
  async getHealth() {
    return this.queueMonitor.getQueueHealth();
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed jobs for debugging' })
  @ApiResponse({ status: 200, description: 'List of failed jobs' })
  async getFailedJobs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.queueMonitor.getFailedJobs(parsedLimit);
  }

  @Post('retry-failed')
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiResponse({
    status: 200,
    description: 'Number of jobs retried',
    schema: { example: { retriedCount: 5 } },
  })
  async retryFailed() {
    const count = await this.queueMonitor.retryFailedJobs();
    return { retriedCount: count };
  }

  @Post('clean-completed')
  @ApiOperation({ summary: 'Clean old completed jobs (default: 24h old)' })
  @ApiResponse({
    status: 200,
    description: 'Number of jobs cleaned',
    schema: { example: { cleanedCount: 100 } },
  })
  async cleanCompleted(@Query('hours') hours?: string) {
    const gracePeriod = hours ? parseInt(hours, 10) * 3600000 : 86400000;
    const count = await this.queueMonitor.cleanCompletedJobs(gracePeriod);
    return { cleanedCount: count };
  }

  @Post('clean-failed')
  @ApiOperation({ summary: 'Clean old failed jobs (default: 7 days old)' })
  @ApiResponse({
    status: 200,
    description: 'Number of jobs cleaned',
    schema: { example: { cleanedCount: 10 } },
  })
  async cleanFailed(@Query('days') days?: string) {
    const gracePeriod = days ? parseInt(days, 10) * 86400000 : 604800000;
    const count = await this.queueMonitor.cleanFailedJobs(gracePeriod);
    return { cleanedCount: count };
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause queue processing' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pause() {
    await this.queueMonitor.pauseQueue();
    return { message: 'Queue paused successfully' };
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume queue processing' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resume() {
    await this.queueMonitor.resumeQueue();
    return { message: 'Queue resumed successfully' };
  }
}
