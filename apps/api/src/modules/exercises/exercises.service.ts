import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ExerciseType, LearningEventType } from '@prisma/client';
import type { LocalizedText } from '@sprachbaum/content-schema';
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
   * Record<blankId, string[]> (formas aceptadas) en fill_blank, number[]
   * (correctOrder) en sentence_order, string[] (accept) en short_answer,
   * Record<left, rightText> en matching.
   */
  revealedSolution?: unknown;
  /**
   * Solo presente si correct && el usuario escribió una variante ASCII
   * (ue/oe/ae/ss) de una forma con diéresis/ß. Permite mostrar "Se escribe:
   * Tschüss" sin penalizar por no tener teclado alemán. fill_blank lo indexa
   * por blank.id; short_answer usa la clave fija "value" (solo hay una
   * respuesta, no huecos que distinguir).
   */
  canonicalAnswers?: Record<string, string>;
}

interface MultipleChoiceSolution {
  correctIndices: number[];
}

interface FillBlankSolution {
  blanks: { id: string; accept: string[]; caseSensitive?: boolean }[];
}

interface SentenceOrderSolution {
  correctOrder: number[];
}

interface ShortAnswerSolution {
  accept: string[];
  caseSensitive?: boolean;
}

interface MatchingSolution {
  pairs: { left: string; right: LocalizedText }[];
}

interface MatchingPayload {
  rights: LocalizedText[];
  [key: string]: unknown;
}

/** Misma prioridad es→de que usa el frontend para mostrar un LocalizedText. */
function resolveLocalized(text: LocalizedText): string {
  return text.es ?? text.de ?? '';
}

function sameIndexSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, i) => value === sortedB[i]);
}

/**
 * `order` debe ser una permutación de 0..correctOrder.length-1: mismos
 * valores que valida content-schema en el YAML (superRefine de
 * SentenceOrderExerciseSchema), pero aquí sobre el intento del usuario, no
 * sobre el contenido — un cliente mal formado podría mandar índices
 * repetidos o fuera de rango.
 */
function isValidOrderShape(order: number[], fragmentCount: number): boolean {
  return (
    order.length === fragmentCount &&
    new Set(order).size === order.length &&
    order.every((index) => index >= 0 && index < fragmentCount)
  );
}

/**
 * A diferencia de multiple_choice (sameIndexSet, orden-independiente), en
 * sentence_order el orden es el propio contenido de la respuesta: se compara
 * posición a posición contra correctOrder, sin crédito parcial.
 */
function correctSentenceOrder(
  order: number[],
  solution: SentenceOrderSolution,
): boolean {
  return (
    order.length === solution.correctOrder.length &&
    order.every((value, i) => value === solution.correctOrder[i])
  );
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

/**
 * short_answer es un fill_blank de un único hueco sin frase alrededor: misma
 * política de normalización (matchesAccepted/canonicalFormIfDifferent), solo
 * que aquí no hay `blank.id` que indexar porque solo hay una respuesta.
 */
function correctShortAnswer(
  value: string,
  solution: ShortAnswerSolution,
): {
  isCorrect: boolean;
  canonicalAnswer?: string;
} {
  const options = { caseSensitive: solution.caseSensitive };
  const isCorrect = matchesAccepted(value, solution.accept, options);
  if (!isCorrect) {
    return { isCorrect };
  }
  const canonicalAnswer = canonicalFormIfDifferent(
    value,
    solution.accept,
    options,
  );
  return { isCorrect, canonicalAnswer };
}

/**
 * matches está keyed por el `left` tal cual (string plano) y valorado por el
 * texto resuelto del `right` que el usuario le asignó — no por índice ni
 * posición, así que es indiferente en qué orden se sirvió `payload.rights`
 * (ver shuffleMatchingRights). Todo-o-nada: correcto solo si cada `left` de
 * la solución tiene una entrada y resuelve al `right` correcto, igual que
 * fill_blank/multiple_choice.
 */
function correctMatching(
  matches: Record<string, string>,
  solution: MatchingSolution,
): {
  isCorrect: boolean;
  revealedSolution: Record<string, string>;
} {
  const revealedSolution: Record<string, string> = {};
  let isCorrect = true;

  for (const pair of solution.pairs) {
    const correctRight = resolveLocalized(pair.right);
    revealedSolution[pair.left] = correctRight;
    if (matches[pair.left] !== correctRight) {
      isCorrect = false;
    }
  }

  return { isCorrect, revealedSolution };
}

function fisherYates<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Baraja `payload.rights` con Fisher-Yates en cada respuesta del servidor, no
 * una vez en el seed: así ninguna carga de la lección repite el mismo orden
 * (reintentar el mismo ejercicio no memoriza posiciones). La corrección
 * (correctMatching) compara por valor, nunca por posición, así que el
 * resultado de este shuffle es puramente de presentación. Una repetición por
 * azar de un tramo sin reordenar (incluida, en el caso límite, la identidad)
 * es la varianza esperada de un shuffle genuino, no un caso a evitar.
 */
export function shuffleMatchingRights(
  exercise: PublicExercise,
): PublicExercise {
  if (exercise.type !== ExerciseType.matching) return exercise;
  const payload = exercise.payload as MatchingPayload;
  return {
    ...exercise,
    payload: { ...payload, rights: fisherYates(payload.rights) },
  };
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
    return shuffleMatchingRights(exercise);
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
    } else if (exercise.type === ExerciseType.sentence_order) {
      if (!('order' in input.answer)) {
        throw new BadRequestException(
          'La respuesta no corresponde al tipo "sentence_order"',
        );
      }
      const solution = exercise.solution as unknown as SentenceOrderSolution;
      if (
        !isValidOrderShape(input.answer.order, solution.correctOrder.length)
      ) {
        throw new BadRequestException(
          'order debe ser una permutación de los índices de fragments',
        );
      }
      isCorrect = correctSentenceOrder(input.answer.order, solution);
      revealedSolutionValue = solution.correctOrder;
    } else if (exercise.type === ExerciseType.short_answer) {
      if (!('value' in input.answer)) {
        throw new BadRequestException(
          'La respuesta no corresponde al tipo "short_answer"',
        );
      }
      const solution = exercise.solution as unknown as ShortAnswerSolution;
      const result = correctShortAnswer(input.answer.value, solution);
      isCorrect = result.isCorrect;
      revealedSolutionValue = solution.accept;
      if (result.canonicalAnswer) {
        canonicalAnswers = { value: result.canonicalAnswer };
      }
    } else if (exercise.type === ExerciseType.matching) {
      if (!('matches' in input.answer)) {
        throw new BadRequestException(
          'La respuesta no corresponde al tipo "matching"',
        );
      }
      const solution = exercise.solution as unknown as MatchingSolution;
      const result = correctMatching(input.answer.matches, solution);
      isCorrect = result.isCorrect;
      revealedSolutionValue = result.revealedSolution;
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
