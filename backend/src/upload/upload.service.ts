import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB

  private readonly allowedMimeTypes = {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'],
    DOCUMENT: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  };

  async ensureUploadDir() {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
  ): Promise<{ path: string; mediaType: string }> {
    await this.ensureUploadDir();

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    // Determine media type
    const mediaType = this.getMediaType(file.mimetype);
    if (!mediaType) {
      throw new BadRequestException('Unsupported file type');
    }

    const fileName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const filePath = join(this.uploadDir, fileName);

    // Save file
    await writeFile(filePath, file.buffer);

    return {
      path: `/uploads/${fileName}`,
      mediaType,
    };
  }

  private getMediaType(mimetype: string): string | null {
    for (const [type, mimes] of Object.entries(this.allowedMimeTypes)) {
      if (mimes.includes(mimetype)) {
        return type;
      }
    }
    return null;
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const mediaType = this.getMediaType(file.mimetype);
    if (!mediaType) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
  }
}
