import { Injectable, NotFoundException } from '@nestjs/common';
import { LearningEventType, Prisma, SrsCardState } from '@prisma/client';
import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';
import { PrismaService } from '../../prisma/prisma.service';
import type { SubmitReviewInput } from './dto/submit-review.dto';

/** Cupo diario de tarjetas nuevas por defecto (docs/plan-mvp.md §3.5). */
const DAILY_NEW_CARDS_LIMIT = 10;

const RATING_TO_GRADE: Record<SubmitReviewInput['rating'], Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const FSRS_TO_PRISMA_STATE: Record<State, SrsCardState> = {
  [State.New]: SrsCardState.New,
  [State.Learning]: SrsCardState.Learning,
  [State.Review]: SrsCardState.Review,
  [State.Relearning]: SrsCardState.Relearning,
};

const PRISMA_TO_FSRS_STATE: Record<SrsCardState, State> = {
  [SrsCardState.New]: State.New,
  [SrsCardState.Learning]: State.Learning,
  [SrsCardState.Review]: State.Review,
  [SrsCardState.Relearning]: State.Relearning,
};

interface PersistedCard {
  id: string;
  userId: string;
  vocabItemId: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: SrsCardState;
  lastReview: Date | null;
}

export interface PublicVocabItemLite {
  slug: string;
  lemma: string;
  translation: unknown;
  example: string | null;
  exampleTranslation: unknown;
  audioUrl: string | null;
  partOfSpeech: string | null;
  gender: string | null;
  plural: string | null;
}

export interface SrsCardPublic {
  id: string;
  state: SrsCardState;
  due: Date;
  vocabItem: PublicVocabItemLite;
}

export interface SrsSessionResponse {
  due: SrsCardPublic[];
  new: SrsCardPublic[];
}

export interface SrsReviewResult {
  cardId: string;
  state: SrsCardState;
  due: Date;
}

const VOCAB_ITEM_SELECT = {
  slug: true,
  lemma: true,
  translation: true,
  example: true,
  exampleTranslation: true,
  audioUrl: true,
  partOfSpeech: true,
  gender: true,
  plural: true,
} satisfies Prisma.VocabItemSelect;

function toPublicCard(card: {
  id: string;
  state: SrsCardState;
  due: Date;
  vocabItem: PublicVocabItemLite;
}): SrsCardPublic {
  return {
    id: card.id,
    state: card.state,
    due: card.due,
    vocabItem: card.vocabItem,
  };
}

function cardToFsrsCard(card: PersistedCard): Card {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: PRISMA_TO_FSRS_STATE[card.state],
    last_review: card.lastReview ?? undefined,
  };
}

@Injectable()
export class SrsService {
  private readonly fsrs = fsrs();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera (upsert idempotente) una SrsCard en estado New por cada VocabItem
   * de las secciones de `lessonId`, para `userId`. Si la tarjeta ya existe no
   * se toca (no resetea progreso si la lección se "recompleta"). Se ejecuta
   * dentro de la transacción de LessonsService.completeLesson junto al
   * LearningEvent LESSON_COMPLETED — de ahí que reciba el `tx`, no
   * `this.prisma`.
   */
  async generateCardsForLesson(
    tx: Prisma.TransactionClient,
    userId: string,
    lessonId: string,
  ): Promise<number> {
    const vocabItems = await tx.vocabItem.findMany({
      where: { section: { lessonId } },
      select: { id: true },
    });

    const empty = createEmptyCard();
    for (const item of vocabItems) {
      await tx.srsCard.upsert({
        where: { userId_vocabItemId: { userId, vocabItemId: item.id } },
        update: {},
        create: {
          userId,
          vocabItemId: item.id,
          due: empty.due,
          stability: empty.stability,
          difficulty: empty.difficulty,
          elapsedDays: empty.elapsed_days,
          scheduledDays: empty.scheduled_days,
          learningSteps: empty.learning_steps,
          reps: empty.reps,
          lapses: empty.lapses,
          state: SrsCardState.New,
          lastReview: null,
        },
      });
    }

    return vocabItems.length;
  }

  /**
   * Sesión diaria: tarjetas vencidas (due <= ahora, ya vistas al menos una
   * vez) + tarjetas nuevas hasta completar el cupo diario restante. El cupo
   * restante se calcula contando tarjetas con reps=1 revisadas hoy (= "esta
   * fue su primera revisión, y ocurrió hoy"), no por su fecha de creación:
   * una tarjeta puede generarse hoy y no estrenarse hasta mañana.
   */
  async buildSession(userId: string): Promise<SrsSessionResponse> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const dueCards = await this.prisma.srsCard.findMany({
      where: { userId, state: { not: SrsCardState.New }, due: { lte: now } },
      orderBy: { due: 'asc' },
      select: {
        id: true,
        state: true,
        due: true,
        vocabItem: { select: VOCAB_ITEM_SELECT },
      },
    });

    const newIntroducedToday = await this.prisma.srsCard.count({
      where: { userId, reps: 1, lastReview: { gte: startOfToday } },
    });
    const remainingQuota = Math.max(
      0,
      DAILY_NEW_CARDS_LIMIT - newIntroducedToday,
    );

    const newCards =
      remainingQuota > 0
        ? await this.prisma.srsCard.findMany({
            where: { userId, state: SrsCardState.New },
            orderBy: { createdAt: 'asc' },
            take: remainingQuota,
            select: {
              id: true,
              state: true,
              due: true,
              vocabItem: { select: VOCAB_ITEM_SELECT },
            },
          })
        : [];

    return {
      due: dueCards.map(toPublicCard),
      new: newCards.map(toPublicCard),
    };
  }

  async review(
    userId: string,
    input: SubmitReviewInput,
  ): Promise<SrsReviewResult> {
    const card = await this.prisma.srsCard.findUnique({
      where: { id: input.cardId },
    });
    if (!card || card.userId !== userId) {
      throw new NotFoundException(`Tarjeta "${input.cardId}" no encontrada`);
    }

    const grade = RATING_TO_GRADE[input.rating];
    const now = new Date();
    const { card: nextCard } = this.fsrs.next(cardToFsrsCard(card), now, grade);
    const nextState = FSRS_TO_PRISMA_STATE[nextCard.state];

    await this.prisma.$transaction(async (tx) => {
      await tx.srsCard.update({
        where: { id: card.id },
        data: {
          due: nextCard.due,
          stability: nextCard.stability,
          difficulty: nextCard.difficulty,
          elapsedDays: nextCard.elapsed_days,
          scheduledDays: nextCard.scheduled_days,
          learningSteps: nextCard.learning_steps,
          reps: nextCard.reps,
          lapses: nextCard.lapses,
          state: nextState,
          lastReview: nextCard.last_review ?? now,
        },
      });

      await tx.learningEvent.create({
        data: {
          userId,
          type: LearningEventType.SRS_REVIEW,
          entityId: card.id,
          data: {
            vocabItemId: card.vocabItemId,
            rating: input.rating,
            latencyMs: input.latencyMs,
            previousState: card.state,
            newState: nextState,
            scheduledDays: nextCard.scheduled_days,
          },
        },
      });
    });

    return { cardId: card.id, state: nextState, due: nextCard.due };
  }
}
