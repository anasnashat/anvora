import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface RefreshTokenPayload {
  sub: string;
  email: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  private readonly planLimits = {
    STARTER: 1000,
    PRO: 10000,
    ENTERPRISE: 100000,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate unique API key
    const apiKey = `wsk_${uuidv4().replace(/-/g, '')}`;

    // Determine plan and limit
    const plan = 'STARTER';
    const planLimit = this.planLimits[plan];

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        apiKey,
        plan,
        planLimit,
      },
    });

    // Generate JWT tokens
    const payload = { sub: user.id, email: user.email, type: 'access' };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.signRefreshToken(user.id, user.email);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        apiKey: user.apiKey,
        plan: user.plan,
        planLimit: user.planLimit,
        messagesSent: user.messagesSent,
      },
    };
  }

  async login(dto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT tokens
    const payload = { sub: user.id, email: user.email, type: 'access' };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.signRefreshToken(user.id, user.email);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        apiKey: user.apiKey,
        plan: user.plan,
        planLimit: user.planLimit,
        messagesSent: user.messagesSent,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async regenerateApiKey(userId: string) {
    const newApiKey = `wsk_${uuidv4().replace(/-/g, '')}`;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { apiKey: newApiKey },
    });

    return { apiKey: user.apiKey };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newPayload = { sub: user.id, email: user.email, type: 'access' };
      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.signRefreshToken(user.id, user.email);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private signRefreshToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '30d',
      },
    );
  }
}
