import { Controller, Get, Param, Post } from '@nestjs/common';
import type { CompleteLessonResult, PublicLesson } from './lessons.service';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get(':slug')
  getLesson(@Param('slug') slug: string): Promise<PublicLesson> {
    return this.lessons.getLessonBySlug(slug);
  }

  @Post(':slug/complete')
  completeLesson(@Param('slug') slug: string): Promise<CompleteLessonResult> {
    return this.lessons.completeLesson(slug);
  }
}
