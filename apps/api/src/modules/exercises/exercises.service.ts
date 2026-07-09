import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ExerciseType, LearningEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserService } from './current-user.provider';
import type { SubmitAttemptInput } from './dto/submit-attempt.dto';

export interface ExerciseListItem {
  id: string;
  type: ExerciseType;
  order: number;
}

export interface PublicExercise {
  id: string;
  type: ExerciseType;
  order: number;
  /** Nunca incluye solution: viene de una query que ni siquiera selecciona esa columna. */
  payload: unknown;
}

export interface AttemptResult {
  correct: boolean;
  attemptNumber: number;
  /** Solo presente si !correct && attemptNumber >= 2 (política de "revela tras el 2º fallo"). */
  revealedSolution?: unknown;
}

interface MultipleChoiceSolution {
  correctIndices: number[];
}

function sameIndexSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentUser: CurrentUserService,
  ) {}

  async listByLessonSlug(lessonSlug: string): Promise<ExerciseListItem[]> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: lessonSlug },
      select: { id: true },
    });
    if (!lesson) {
      throw new NotFoundException(`Lección "${lessonSlug}" no encontrada`);
    }
    return this.prisma.exercise.findMany({
      where: { lessonId: lesson.id },
      select: { id: true, type: true, order: true },
      orderBy: { order: 'asc' },
    });
  }

  async getPublicExercise(id: string): Promise<PublicExercise> {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      select: { id: true, type: true, order: true, payload: true },
    });
    if (!exercise) {
      throw new NotFoundException(`Ejercicio "${id}" no encontrado`);
    }
    return exercise;
  }

  async submitAttempt(
    exerciseId: string,
    input: SubmitAttemptInput,
  ): Promise<AttemptResult> {
    // Única query de todo el módulo que selecciona `solution`.
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, type: true, skillId: true, solution: true },
    });
    if (!exercise) {
      throw new NotFoundException(`Ejercicio "${exerciseId}" no encontrado`);
    }
    if (exercise.type !== ExerciseType.multiple_choice) {
      throw new NotImplementedException(
        `Corrección para el tipo "${exercise.type}" aún no implementada en este slice`,
      );
    }

    const solution = exercise.solution as unknown as MultipleChoiceSolution;
    const isCorrect = sameIndexSet(
      input.answer.selectedIndices,
      solution.correctIndices,
    );
    const userId = await this.currentUser.getUserId();

    const attemptNumber = await this.prisma.$transaction(async (tx) => {
      const priorAttempts = await tx.attempt.count({
        where: { userId, exerciseId },
      });
      const nextAttemptNumber = priorAttempts + 1;

      await tx.attempt.create({
        data: {
          userId,
          exerciseId,
          attemptNumber: nextAttemptNumber,
          answer: input.answer,
          isCorrect,
          latencyMs: input.latencyMs,
        },
      });

      await tx.learningEvent.create({
        data: {
          userId,
          type: LearningEventType.EXERCISE_ATTEMPT,
          entityId: exerciseId,
          data: {
            exerciseType: exercise.type,
            isCorrect,
            attemptNumber: nextAttemptNumber,
            latencyMs: input.latencyMs,
            skillId: exercise.skillId,
          },
        },
      });

      return nextAttemptNumber;
    });

    const shouldReveal = !isCorrect && attemptNumber >= 2;
    return {
      correct: isCorrect,
      attemptNumber,
      ...(shouldReveal ? { revealedSolution: solution.correctIndices } : {}),
    };
  }
}
