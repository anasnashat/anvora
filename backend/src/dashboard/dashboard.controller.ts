import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { User } from '@prisma/client';

interface RequestWithUser extends Request {
  user: User;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getUsage(@Req() req: RequestWithUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        instances: {
          select: {
            id: true,
            name: true,
            status: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Get message stats
    const messageStats = await this.prisma.messageLog.groupBy({
      by: ['status'],
      where: {
        instance: {
          userId: req.user.id,
        },
      },
      _count: true,
    });

    // Get daily message count for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyMessages = await this.prisma.messageLog.findMany({
      where: {
        instance: { userId: req.user.id },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Aggregate by day
    const dailyStats: Record<string, number> = {};
    dailyMessages.forEach((msg) => {
      const day = msg.createdAt.toISOString().split('T')[0];
      dailyStats[day] = (dailyStats[day] || 0) + 1;
    });

    return {
      user: {
        id: user?.id,
        email: user?.email,
        apiKey: user?.apiKey,
        plan: user?.plan,
        planLimit: user?.planLimit,
        messagesSent: user?.messagesSent,
        messagesRemaining: (user?.planLimit || 0) - (user?.messagesSent || 0),
      },
      instances: user?.instances,
      messageStats: messageStats.reduce(
        (acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      dailyStats,
    };
  }

  @Post('regenerate-api-key')
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  async regenerateApiKey(@Req() req: RequestWithUser) {
    return this.authService.regenerateApiKey(req.user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Req() req: RequestWithUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        apiKey: true,
        planLimit: true,
        messagesSent: true,
        createdAt: true,
      },
    });

    return user;
  }
}
