import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ExerciseType, LearningEventType } from '@prisma/client';
import { canonicalFormIfDifferent, matchesAccepted } from '@sprachbaum/shared';
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
  /**
   * Solo presente si !correct && attemptNumber >= 2 (política de "revela tras
   * el 2º fallo"). Forma depende del tipo: number[] en multiple_choice,
   * Record<blankId, string[]> (formas aceptadas) en fill_blank.
   */
  revealedSolution?: unknown;
  /**
   * Solo presente si correct && el usuario escribió una variante ASCII
   * (ue/oe/ae/ss) de una forma con diéresis/ß. Permite mostrar "Se escribe:
   * Tschüss" sin penalizar por no tener teclado alemán. Hoy solo lo rellena
   * fill_blank.
   */
  canonicalAnswers?: Record<string, string>;
}

interface MultipleChoiceSolution {
  correctIndices: number[];
}

interface FillBlankSolution {
  blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
}

function sameIndexSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

/**
 * Corrige un intento de fill_blank hueco a hueco: cada blank se compara contra
 * su propio `accept[]`/`caseSensitive` (nunca contra los demás huecos). El
 * ejercicio completo es correcto solo si todos los huecos lo son — sin crédito
 * parcial, igual que multiple_choice.
 */
function correctFillBlank(
  values: Record<string, string>,
  solution: FillBlankSolution,
): {
  isCorrect: boolean;
  revealedSolution: Record<string, string[]>;
  canonicalAnswers: Record<string, string>;
} {
  const revealedSolution: Record<string, string[]> = {};
  const canonicalAnswers: Record<string, string> = {};
  let isCorrect = true;

  for (const blank of solution.blanks) {
    const submitted = values[blank.id] ?? '';
    const options = { caseSensitive: blank.caseSensitive };
    revealedSolution[blank.id] = blank.accept;

    if (!matchesAccepted(submitted, blank.accept, options)) {
      isCorrect = false;
      continue;
    }
    const canonical = canonicalFormIfDifferent(
      submitted,
      blank.accept,
      options,
    );
    if (canonical) {
      canonicalAnswers[blank.id] = canonical;
    }
  }

  return { isCorrect, revealedSolution, canonicalAnswers };
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

    let isCorrect: boolean;
    let revealedSolutionValue: unknown;
    let canonicalAnswers: Record<string, string> | undefined;

    if (exercise.type === ExerciseType.multiple_choice) {
      if (!('selectedIndices' in input.answer)) {
        throw new BadRequestException(
          'La respuesta no corresponde al tipo "multiple_choice"',
        );
      }
      const solution = exercise.solution as unknown as MultipleChoiceSolution;
      isCorrect = sameIndexSet(
        input.answer.selectedIndices,
        solution.correctIndices,
      );
      revealedSolutionValue = solution.correctIndices;
    } else if (exercise.type === ExerciseType.fill_blank) {
      if (!('values' in input.answer)) {
        throw new BadRequestException(
          'La respuesta no corresponde al tipo "fill_blank"',
        );
      }
      const solution = exercise.solution as unknown as FillBlankSolution;
      const result = correctFillBlank(input.answer.values, solution);
      isCorrect = result.isCorrect;
      revealedSolutionValue = result.revealedSolution;
      if (Object.keys(result.canonicalAnswers).length > 0) {
        canonicalAnswers = result.canonicalAnswers;
      }
    } else {
      throw new NotImplementedException(
        `Corrección para el tipo "${exercise.type}" aún no implementada en este slice`,
      );
    }

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
      ...(shouldReveal ? { revealedSolution: revealedSolutionValue } : {}),
      ...(isCorrect && canonicalAnswers ? { canonicalAnswers } : {}),
    };
  }
}
