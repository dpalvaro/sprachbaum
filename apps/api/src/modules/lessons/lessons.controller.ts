import { Controller, Get, Param } from '@nestjs/common';
import type { PublicLesson } from './lessons.service';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get(':slug')
  getLesson(@Param('slug') slug: string): Promise<PublicLesson> {
    return this.lessons.getLessonBySlug(slug);
  }
}
