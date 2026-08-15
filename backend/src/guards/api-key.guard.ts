import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Find user by API key
    const user = await this.prisma.user.findUnique({
      where: { apiKey },
      include: {
        instances: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach user to request
    request.user = user;

    // If instance ID is provided, verify it belongs to user
    const instanceId = request.body?.instanceId || request.query?.instanceId;
    if (instanceId) {
      const instance = await this.prisma.instance.findFirst({
        where: {
          id: instanceId,
          userId: user.id,
        },
      });

      if (!instance) {
        throw new UnauthorizedException(
          'Instance not found or does not belong to user',
        );
      }

      request.instance = instance;
    } else if (user.instances.length > 0) {
      // Use first connected instance if none specified
      request.instance = user.instances[0];
    }

    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check Authorization header (Bearer token style)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    return null;
  }
}
