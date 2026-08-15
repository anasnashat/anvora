import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './templates.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract variables from template content (e.g., {{name}}, {{company}})
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Substitute variables in template content
   */
  substituteVariables(
    content: string,
    variables: Record<string, string>,
  ): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      result = result.split(`{{${key}}}`).join(value || '');
    }

    return result;
  }

  async create(userId: string, dto: CreateTemplateDto) {
    const variables = this.extractVariables(dto.content);

    return this.prisma.template.create({
      data: {
        name: dto.name,
        content: dto.content,
        variables,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, userId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    // Check if template exists and belongs to user
    await this.findOne(userId, id);

    const updateData: any = {};

    if (dto.name) {
      updateData.name = dto.name;
    }

    if (dto.content) {
      updateData.content = dto.content;
      updateData.variables = this.extractVariables(dto.content);
    }

    return this.prisma.template.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(userId: string, id: string) {
    // Check if template exists and belongs to user
    await this.findOne(userId, id);

    await this.prisma.template.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Preview template with variables
   */
  async preview(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
  ) {
    const template = await this.findOne(userId, templateId);
    const content = this.substituteVariables(template.content, variables);

    return {
      originalContent: template.content,
      previewContent: content,
      variables: template.variables,
      providedVariables: variables,
    };
  }
}
