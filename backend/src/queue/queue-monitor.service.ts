import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

export interface QueueMetrics {
  name: string;
  stats: QueueStats;
  isPaused: boolean;
  workers: number;
}

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);

  constructor(
    @InjectQueue('whatsapp-messages') private readonly messagesQueue: Queue,
  ) {}

  /**
   * Get comprehensive queue statistics
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    const counts = await this.messagesQueue.getJobCounts();
    const isPaused = await this.messagesQueue.isPaused();
    const workers = await this.messagesQueue.getWorkersCount();

    return {
      name: 'whatsapp-messages',
      stats: {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      },
      isPaused,
      workers,
    };
  }

  /**
   * Get failed jobs with details for debugging
   */
  async getFailedJobs(limit = 10) {
    const failed = await this.messagesQueue.getFailed(0, limit - 1);
    return failed.map((job) => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  /**
   * Retry all failed jobs
   */
  async retryFailedJobs(): Promise<number> {
    const failed = await this.messagesQueue.getFailed();
    let retried = 0;

    for (const job of failed) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    this.logger.log(`Retried ${retried} failed jobs`);
    return retried;
  }

  /**
   * Clean old completed jobs to prevent memory bloat
   */
  async cleanCompletedJobs(gracePeriod = 86400000): Promise<number> {
    // Default: clean jobs older than 24 hours
    const cleaned = await this.messagesQueue.clean(
      gracePeriod,
      1000,
      'completed',
    );
    this.logger.log(`Cleaned ${cleaned.length} completed jobs`);
    return cleaned.length;
  }

  /**
   * Clean old failed jobs
   */
  async cleanFailedJobs(gracePeriod = 604800000): Promise<number> {
    // Default: clean jobs older than 7 days
    const cleaned = await this.messagesQueue.clean(gracePeriod, 1000, 'failed');
    this.logger.log(`Cleaned ${cleaned.length} failed jobs`);
    return cleaned.length;
  }

  /**
   * Pause the queue (stops processing new jobs)
   */
  async pauseQueue(): Promise<void> {
    await this.messagesQueue.pause();
    this.logger.warn('Queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.messagesQueue.resume();
    this.logger.log('Queue resumed');
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: QueueMetrics;
  }> {
    const metrics = await this.getQueueMetrics();
    const issues: string[] = [];

    // Check for too many waiting jobs
    if (metrics.stats.waiting > 1000) {
      issues.push(`High number of waiting jobs: ${metrics.stats.waiting}`);
    }

    // Check for stuck active jobs (potential deadlock)
    if (metrics.stats.active > 50) {
      issues.push(`High number of active jobs: ${metrics.stats.active}`);
    }

    // Check for too many failed jobs
    if (metrics.stats.failed > 100) {
      issues.push(`High number of failed jobs: ${metrics.stats.failed}`);
    }

    // Check if queue is paused unexpectedly
    if (metrics.isPaused) {
      issues.push('Queue is paused');
    }

    // Check if no workers are running
    if (metrics.workers === 0) {
      issues.push('No workers running');
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}
