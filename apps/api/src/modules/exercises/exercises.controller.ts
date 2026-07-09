import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { SubmitAttemptSchema } from './dto/submit-attempt.dto';
import type {
  AttemptResult,
  ExerciseListItem,
  PublicExercise,
} from './exercises.service';
import { ExercisesService } from './exercises.service';

@Controller()
export class ExercisesController {
  constructor(private readonly exercises: ExercisesService) {}

  @Get('lessons/:slug/exercises')
  listByLesson(@Param('slug') slug: string): Promise<ExerciseListItem[]> {
    return this.exercises.listByLessonSlug(slug);
  }

  @Get('exercises/:id')
  getExercise(@Param('id') id: string): Promise<PublicExercise> {
    return this.exercises.getPublicExercise(id);
  }

  @Post('exercises/:id/attempts')
  submitAttempt(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AttemptResult> {
    const parsed = SubmitAttemptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.exercises.submitAttempt(id, parsed.data);
  }
}
