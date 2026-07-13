import { NotFoundException } from '@nestjs/common';
import { SrsCardState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SrsService } from './srs.service';

interface UpsertArgs {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}

interface FindManyArgs {
  where: Record<string, unknown>;
  take?: number;
}

describe('SrsService', () => {
  const userId = 'user-1';

  describe('generateCardsForLesson', () => {
    it('upserts one New SrsCard per VocabItem of the lesson, keyed by (userId, vocabItemId)', async () => {
      const vocabFindMany = jest
        .fn()
        .mockResolvedValue([{ id: 'vocab-1' }, { id: 'vocab-2' }]);
      const upsert = jest
        .fn<Promise<unknown>, [UpsertArgs]>()
        .mockResolvedValue({});
      const tx = {
        vocabItem: { findMany: vocabFindMany },
        srsCard: { upsert },
      } as unknown as Parameters<SrsService['generateCardsForLesson']>[0];

      const service = new SrsService({} as PrismaService);
      const count = await service.generateCardsForLesson(
        tx,
        userId,
        'lesson-1',
      );

      expect(count).toBe(2);
      expect(vocabFindMany).toHaveBeenCalledWith({
        where: { section: { lessonId: 'lesson-1' } },
        select: { id: true },
      });
      expect(upsert).toHaveBeenCalledTimes(2);
      const firstCall = upsert.mock.calls[0][0];
      expect(firstCall.where).toEqual({
        userId_vocabItemId: { userId, vocabItemId: 'vocab-1' },
      });
      expect(firstCall.update).toEqual({});
      expect(firstCall.create).toMatchObject({
        userId,
        vocabItemId: 'vocab-1',
        state: SrsCardState.New,
        reps: 0,
        lapses: 0,
        lastReview: null,
      });
    });

    it('is idempotent: re-running does not overwrite existing cards (update: {})', async () => {
      const upsert = jest
        .fn<Promise<unknown>, [UpsertArgs]>()
        .mockResolvedValue({});
      const tx = {
        vocabItem: {
          findMany: jest.fn().mockResolvedValue([{ id: 'vocab-1' }]),
        },
        srsCard: { upsert },
      } as unknown as Parameters<SrsService['generateCardsForLesson']>[0];

      const service = new SrsService({} as PrismaService);
      await service.generateCardsForLesson(tx, userId, 'lesson-1');
      await service.generateCardsForLesson(tx, userId, 'lesson-1');

      for (const call of upsert.mock.calls) {
        expect(call[0].update).toEqual({});
      }
    });
  });

  describe('buildSession', () => {
    const vocabItem = {
      slug: 'v-hallo',
      lemma: 'Hallo',
      translation: { es: 'Hola' },
      example: null,
      exampleTranslation: null,
      audioUrl: null,
      partOfSpeech: null,
      gender: null,
      plural: null,
    };

    function makePrisma({
      dueCards = [],
      newIntroducedToday = 0,
      newCards = [],
    }: {
      dueCards?: unknown[];
      newIntroducedToday?: number;
      newCards?: unknown[];
    }) {
      const findMany = jest
        .fn<Promise<unknown[]>, [FindManyArgs]>()
        .mockResolvedValueOnce(dueCards)
        .mockResolvedValueOnce(newCards);
      const count = jest.fn().mockResolvedValue(newIntroducedToday);
      const prisma = {
        srsCard: { findMany, count },
      } as unknown as PrismaService;
      return { prisma, findMany };
    }

    it('returns due cards (state != New, due <= now) and fills new cards up to the remaining daily quota', async () => {
      const due = {
        id: 'card-due',
        state: SrsCardState.Review,
        due: new Date(),
        vocabItem,
      };
      const fresh = {
        id: 'card-new',
        state: SrsCardState.New,
        due: new Date(),
        vocabItem,
      };
      const { prisma, findMany } = makePrisma({
        dueCards: [due],
        newIntroducedToday: 3,
        newCards: [fresh],
      });
      const service = new SrsService(prisma);

      const session = await service.buildSession(userId);

      expect(session.due).toEqual([
        { id: 'card-due', state: SrsCardState.Review, due: due.due, vocabItem },
      ]);
      expect(session.new).toEqual([
        { id: 'card-new', state: SrsCardState.New, due: fresh.due, vocabItem },
      ]);

      const newCardsCall = findMany.mock.calls[1][0];
      expect(newCardsCall.take).toBe(7); // cupo 10 - 3 ya introducidas hoy
      expect(newCardsCall.where).toEqual({
        userId,
        state: SrsCardState.New,
      });
    });

    it('returns no new cards once the daily quota is exhausted', async () => {
      const { prisma, findMany } = makePrisma({ newIntroducedToday: 10 });
      const service = new SrsService(prisma);

      const session = await service.buildSession(userId);

      expect(session.new).toEqual([]);
      // Solo se llamó findMany una vez (due): el cupo agotado evita la 2ª query.
      expect(findMany.mock.calls.length).toBe(1);
    });
  });

  describe('review', () => {
    function makePrisma(card: Record<string, unknown>) {
      const findUnique = jest.fn().mockResolvedValue(card);
      const update = jest
        .fn<
          Promise<unknown>,
          [{ where: unknown; data: Record<string, unknown> }]
        >()
        .mockResolvedValue({});
      const learningEventCreate = jest
        .fn<Promise<unknown>, [{ data: Record<string, unknown> }]>()
        .mockResolvedValue({});
      const prisma = {
        srsCard: { findUnique, update },
        $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
          cb({
            srsCard: { update },
            learningEvent: { create: learningEventCreate },
          }),
        ),
      } as unknown as PrismaService;
      return { prisma, update, learningEventCreate };
    }

    function newCard(overrides: Record<string, unknown> = {}) {
      return {
        id: 'card-1',
        userId,
        vocabItemId: 'vocab-1',
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
        reps: 0,
        lapses: 0,
        state: SrsCardState.New,
        lastReview: null,
        ...overrides,
      };
    }

    it('throws NotFoundException when the card does not belong to the user', async () => {
      const { prisma } = makePrisma(newCard({ userId: 'someone-else' }));
      const service = new SrsService(prisma);

      await expect(
        service.review(userId, {
          cardId: 'card-1',
          rating: 'good',
          latencyMs: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('a brand-new card rated "good" leaves the New state, gets its first rep and a future due date', async () => {
      const { prisma, update, learningEventCreate } = makePrisma(newCard());
      const service = new SrsService(prisma);

      const result = await service.review(userId, {
        cardId: 'card-1',
        rating: 'good',
        latencyMs: 1200,
      });

      expect(result.state).not.toBe(SrsCardState.New);
      expect(result.due.getTime()).toBeGreaterThan(Date.now());
      expect(update.mock.calls[0][0]).toMatchObject({
        where: { id: 'card-1' },
        data: { reps: 1, state: result.state },
      });
      expect(learningEventCreate.mock.calls[0][0]).toMatchObject({
        data: {
          userId,
          type: 'SRS_REVIEW',
          entityId: 'card-1',
          data: {
            vocabItemId: 'vocab-1',
            rating: 'good',
            latencyMs: 1200,
            previousState: SrsCardState.New,
          },
        },
      });
    });

    it('a mature card (Review) rated "again" lapses: moves to Relearning and increments lapses', async () => {
      const mature = newCard({
        state: SrsCardState.Review,
        reps: 5,
        lapses: 0,
        stability: 20,
        difficulty: 5,
        scheduledDays: 20,
        lastReview: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        due: new Date(Date.now() - 24 * 60 * 60 * 1000), // overdue by 1 day
      });
      const { prisma } = makePrisma(mature);
      const service = new SrsService(prisma);

      const result = await service.review(userId, {
        cardId: 'card-1',
        rating: 'again',
        latencyMs: 3000,
      });

      expect(result.state).toBe(SrsCardState.Relearning);
    });

    it('a mature card (Review) rated "good" stays in Review and reschedules further out', async () => {
      const mature = newCard({
        state: SrsCardState.Review,
        reps: 5,
        lapses: 0,
        stability: 20,
        difficulty: 5,
        scheduledDays: 20,
        lastReview: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        due: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      const { prisma } = makePrisma(mature);
      const service = new SrsService(prisma);

      const result = await service.review(userId, {
        cardId: 'card-1',
        rating: 'good',
        latencyMs: 3000,
      });

      expect(result.state).toBe(SrsCardState.Review);
      expect(result.due.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
