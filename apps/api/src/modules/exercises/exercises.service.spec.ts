import {
  BadRequestException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ExerciseType } from '@prisma/client';
import { CurrentUserService } from './current-user.provider';
import { ExercisesService } from './exercises.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ExercisesService', () => {
  const exerciseId = 'ex-1';
  const userId = 'user-1';

  let findUnique: jest.Mock;
  let count: jest.Mock;
  let create: jest.Mock<unknown, [{ data: Record<string, unknown> }]>;
  let learningEventCreate: jest.Mock<
    unknown,
    [{ data: Record<string, unknown> }]
  >;
  let prisma: PrismaService;
  let service: ExercisesService;

  function mcExercise(correctIndices: number[]) {
    return {
      id: exerciseId,
      type: ExerciseType.multiple_choice,
      skillId: 'skill-1',
      solution: { correctIndices },
    };
  }

  function fbExercise(
    blanks: { id: string; accept: string[]; caseSensitive?: boolean }[],
  ) {
    return {
      id: exerciseId,
      type: ExerciseType.fill_blank,
      skillId: 'skill-1',
      solution: { blanks },
    };
  }

  function soExercise(correctOrder: number[]) {
    return {
      id: exerciseId,
      type: ExerciseType.sentence_order,
      skillId: 'skill-1',
      solution: { correctOrder },
    };
  }

  function saExercise(accept: string[], caseSensitive?: boolean) {
    return {
      id: exerciseId,
      type: ExerciseType.short_answer,
      skillId: 'skill-1',
      solution: { accept, caseSensitive },
    };
  }

  function mExercise(pairs: { left: string; right: { es: string } }[]) {
    return {
      id: exerciseId,
      type: ExerciseType.matching,
      skillId: 'skill-1',
      solution: { pairs },
    };
  }

  beforeEach(() => {
    findUnique = jest.fn();
    count = jest.fn();
    create = jest.fn<unknown, [{ data: Record<string, unknown> }]>();
    learningEventCreate = jest.fn<
      unknown,
      [{ data: Record<string, unknown> }]
    >();

    prisma = {
      exercise: { findUnique },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({
          attempt: { count, create },
          learningEvent: { create: learningEventCreate },
        }),
      ),
    } as unknown as PrismaService;

    const currentUser = {
      getUserId: jest.fn().mockResolvedValue(userId),
    } as unknown as CurrentUserService;

    service = new ExercisesService(prisma, currentUser);
  });

  it('marks the answer correct on the first attempt and does not reveal the solution', async () => {
    findUnique.mockResolvedValue(mcExercise([0]));
    count.mockResolvedValue(0);

    const result = await service.submitAttempt(exerciseId, {
      answer: { selectedIndices: [0] },
      latencyMs: 500,
    });

    expect(result).toEqual({ correct: true, attemptNumber: 1 });
    expect(create.mock.calls[0][0]).toMatchObject({
      data: { userId, exerciseId, attemptNumber: 1, isCorrect: true },
    });
    expect(learningEventCreate.mock.calls[0][0]).toMatchObject({
      data: {
        userId,
        entityId: exerciseId,
        data: { isCorrect: true, attemptNumber: 1 },
      },
    });
  });

  it('treats selectedIndices as a set: order does not matter', async () => {
    findUnique.mockResolvedValue(mcExercise([0, 1]));
    count.mockResolvedValue(0);

    const result = await service.submitAttempt(exerciseId, {
      answer: { selectedIndices: [1, 0] },
      latencyMs: 500,
    });

    expect(result.correct).toBe(true);
  });

  it('does not reveal the solution on the first wrong attempt', async () => {
    findUnique.mockResolvedValue(mcExercise([0]));
    count.mockResolvedValue(0);

    const result = await service.submitAttempt(exerciseId, {
      answer: { selectedIndices: [1] },
      latencyMs: 500,
    });

    expect(result).toEqual({ correct: false, attemptNumber: 1 });
    expect(result).not.toHaveProperty('revealedSolution');
  });

  it('reveals the solution once the 2nd attempt is also wrong', async () => {
    findUnique.mockResolvedValue(mcExercise([0]));
    count.mockResolvedValue(1); // ya hubo 1 intento previo

    const result = await service.submitAttempt(exerciseId, {
      answer: { selectedIndices: [1] },
      latencyMs: 500,
    });

    expect(result).toEqual({
      correct: false,
      attemptNumber: 2,
      revealedSolution: [0],
    });
  });

  it('does not reveal the solution if the 2nd attempt is correct', async () => {
    findUnique.mockResolvedValue(mcExercise([0]));
    count.mockResolvedValue(1);

    const result = await service.submitAttempt(exerciseId, {
      answer: { selectedIndices: [0] },
      latencyMs: 500,
    });

    expect(result).toEqual({ correct: true, attemptNumber: 2 });
    expect(result).not.toHaveProperty('revealedSolution');
  });

  it('throws NotFoundException when the exercise does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.submitAttempt(exerciseId, {
        answer: { selectedIndices: [0] },
        latencyMs: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotImplementedException for exercise types without correction logic yet', async () => {
    findUnique.mockResolvedValue({
      id: exerciseId,
      type: ExerciseType.dictation,
      skillId: 'skill-1',
      solution: { expected: 'Hallo' },
    });

    await expect(
      service.submitAttempt(exerciseId, {
        answer: { selectedIndices: [0] },
        latencyMs: 0,
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
  });

  describe('fill_blank', () => {
    it('marks a single-blank exercise correct on an exact match', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'bin' } },
        latencyMs: 500,
      });

      expect(result).toEqual({ correct: true, attemptNumber: 1 });
    });

    it('is case-insensitive by default', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'BIN' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('trims and collapses whitespace without penalizing', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: '  bin  ' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('respects caseSensitive: true for a given blank', async () => {
      findUnique.mockResolvedValue(
        fbExercise([{ id: 'b1', accept: ['Anna'], caseSensitive: true }]),
      );
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'anna' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('treats ü/ö/ä/ß as equivalent to ue/oe/ae/ss', async () => {
      findUnique.mockResolvedValue(
        fbExercise([{ id: 'b1', accept: ['Tschüss'] }]),
      );
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'Tschuss' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('surfaces the canonical spelling when the digraph equivalence closed the gap', async () => {
      findUnique.mockResolvedValue(
        fbExercise([{ id: 'b1', accept: ['Tschüss'] }]),
      );
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'Tschuss' } },
        latencyMs: 500,
      });

      expect(result.canonicalAnswers).toEqual({ b1: 'Tschüss' });
    });

    it('does not surface a canonical spelling when the answer already matches textually', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'Bin' } },
        latencyMs: 500,
      });

      expect(result).not.toHaveProperty('canonicalAnswers');
    });

    it('requires every blank to match for a multi-blank exercise to be correct', async () => {
      findUnique.mockResolvedValue(
        fbExercise([
          { id: 'b1', accept: ['bin'] },
          { id: 'b2', accept: ['Student'] },
        ]),
      );
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'bin', b2: 'Studentin' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('reveals the accepted forms per blank once the 2nd attempt is also wrong', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));
      count.mockResolvedValue(1);

      const result = await service.submitAttempt(exerciseId, {
        answer: { values: { b1: 'bist' } },
        latencyMs: 500,
      });

      expect(result).toEqual({
        correct: false,
        attemptNumber: 2,
        revealedSolution: { b1: ['bin'] },
      });
    });

    it('rejects an answer shape that does not match the fill_blank exercise', async () => {
      findUnique.mockResolvedValue(fbExercise([{ id: 'b1', accept: ['bin'] }]));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { selectedIndices: [0] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('sentence_order', () => {
    it('marks the answer correct when order matches correctOrder exactly', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { order: [2, 1, 0] },
        latencyMs: 500,
      });

      expect(result).toEqual({ correct: true, attemptNumber: 1 });
    });

    it('treats order as positional: same fragments in the wrong sequence are incorrect', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { order: [0, 1, 2] },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('rejects an answer shape that does not match sentence_order', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { selectedIndices: [0] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an order that is not a valid permutation of the fragment indices', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { order: [0, 0, 1] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an order with the wrong length', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { order: [0, 1] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reveals correctOrder once the 2nd attempt is also wrong', async () => {
      findUnique.mockResolvedValue(soExercise([2, 1, 0]));
      count.mockResolvedValue(1);

      const result = await service.submitAttempt(exerciseId, {
        answer: { order: [0, 1, 2] },
        latencyMs: 500,
      });

      expect(result).toEqual({
        correct: false,
        attemptNumber: 2,
        revealedSolution: [2, 1, 0],
      });
    });
  });

  describe('short_answer', () => {
    it('marks the answer correct on an exact match', async () => {
      findUnique.mockResolvedValue(saExercise(['danke', 'Danke']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'danke' },
        latencyMs: 500,
      });

      expect(result).toEqual({ correct: true, attemptNumber: 1 });
    });

    it('is case-insensitive by default', async () => {
      findUnique.mockResolvedValue(saExercise(['danke']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'DANKE' },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('trims and collapses whitespace without penalizing', async () => {
      findUnique.mockResolvedValue(saExercise(['danke']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: '  danke  ' },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('respects caseSensitive: true', async () => {
      findUnique.mockResolvedValue(saExercise(['Danke'], true));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'danke' },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('treats ü/ö/ä/ß as equivalent to ue/oe/ae/ss', async () => {
      findUnique.mockResolvedValue(saExercise(['Tschüss']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'Tschuss' },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('surfaces the canonical spelling under the "value" key when the digraph equivalence closed the gap', async () => {
      findUnique.mockResolvedValue(saExercise(['Tschüss']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'Tschuss' },
        latencyMs: 500,
      });

      expect(result.canonicalAnswers).toEqual({ value: 'Tschüss' });
    });

    it('does not surface a canonical spelling when the answer already matches textually', async () => {
      findUnique.mockResolvedValue(saExercise(['danke']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'Danke' },
        latencyMs: 500,
      });

      expect(result).not.toHaveProperty('canonicalAnswers');
    });

    it('does not reveal the solution on the first wrong attempt', async () => {
      findUnique.mockResolvedValue(saExercise(['danke']));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'bitte' },
        latencyMs: 500,
      });

      expect(result).toEqual({ correct: false, attemptNumber: 1 });
      expect(result).not.toHaveProperty('revealedSolution');
    });

    it('reveals the accepted forms once the 2nd attempt is also wrong', async () => {
      findUnique.mockResolvedValue(saExercise(['danke', 'Danke']));
      count.mockResolvedValue(1);

      const result = await service.submitAttempt(exerciseId, {
        answer: { value: 'bitte' },
        latencyMs: 500,
      });

      expect(result).toEqual({
        correct: false,
        attemptNumber: 2,
        revealedSolution: ['danke', 'Danke'],
      });
    });

    it('rejects an answer shape that does not match short_answer', async () => {
      findUnique.mockResolvedValue(saExercise(['danke']));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { selectedIndices: [0] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('matching', () => {
    const pairs = [
      { left: 'hallo', right: { es: 'hola' } },
      { left: 'danke', right: { es: 'gracias' } },
      { left: 'tschüss', right: { es: 'adiós' } },
    ];

    it('marks the answer correct when every left resolves to its right text', async () => {
      findUnique.mockResolvedValue(mExercise(pairs));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: {
          matches: { hallo: 'hola', danke: 'gracias', tschüss: 'adiós' },
        },
        latencyMs: 500,
      });

      expect(result).toEqual({ correct: true, attemptNumber: 1 });
    });

    it('requires every pair to match: one wrong pairing fails the whole exercise', async () => {
      findUnique.mockResolvedValue(mExercise(pairs));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: {
          // hallo↔danke swapped
          matches: { hallo: 'gracias', danke: 'hola', tschüss: 'adiós' },
        },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('is incorrect when a left is missing from matches', async () => {
      findUnique.mockResolvedValue(mExercise(pairs));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: { matches: { hallo: 'hola', danke: 'gracias' } },
        latencyMs: 500,
      });

      expect(result.correct).toBe(false);
    });

    it('is indifferent to the order the pairs were declared in solution.pairs', async () => {
      findUnique.mockResolvedValue(mExercise([...pairs].reverse()));
      count.mockResolvedValue(0);

      const result = await service.submitAttempt(exerciseId, {
        answer: {
          matches: { hallo: 'hola', danke: 'gracias', tschüss: 'adiós' },
        },
        latencyMs: 500,
      });

      expect(result.correct).toBe(true);
    });

    it('reveals the correct right text per left once the 2nd attempt is also wrong', async () => {
      findUnique.mockResolvedValue(mExercise(pairs));
      count.mockResolvedValue(1);

      const result = await service.submitAttempt(exerciseId, {
        answer: {
          matches: { hallo: 'gracias', danke: 'hola', tschüss: 'adiós' },
        },
        latencyMs: 500,
      });

      expect(result).toEqual({
        correct: false,
        attemptNumber: 2,
        revealedSolution: { hallo: 'hola', danke: 'gracias', tschüss: 'adiós' },
      });
    });

    it('rejects an answer shape that does not match matching', async () => {
      findUnique.mockResolvedValue(mExercise(pairs));

      await expect(
        service.submitAttempt(exerciseId, {
          answer: { selectedIndices: [0] },
          latencyMs: 0,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPublicExercise / shuffleMatchingRights', () => {
    it('serves matching payload.rights as a shuffled permutation, never the stored order alone', async () => {
      const rights = [
        { es: 'hola' },
        { es: 'gracias' },
        { es: 'adiós' },
        { es: 'por favor' },
        { es: 'buenos días' },
        { es: 'buenas noches' },
      ];
      findUnique.mockResolvedValue({
        id: exerciseId,
        type: ExerciseType.matching,
        order: 0,
        payload: { lefts: ['a', 'b', 'c', 'd', 'e', 'f'], rights },
      });

      const result = await service.getPublicExercise(exerciseId);

      const servedRights = (result.payload as { rights: { es: string }[] })
        .rights;
      expect(servedRights).toHaveLength(rights.length);
      // Mismo multiconjunto de elementos, sin importar el orden.
      expect(
        [...servedRights].sort((a, b) => a.es.localeCompare(b.es)),
      ).toEqual([...rights].sort((a, b) => a.es.localeCompare(b.es)));
      // lefts no se toca: solo rights se baraja.
      expect((result.payload as { lefts: string[] }).lefts).toEqual([
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
      ]);
    });

    it('does not touch payload for non-matching exercise types', async () => {
      const payload = { options: ['a', 'b'] };
      findUnique.mockResolvedValue({
        id: exerciseId,
        type: ExerciseType.multiple_choice,
        order: 0,
        payload,
      });

      const result = await service.getPublicExercise(exerciseId);

      expect(result.payload).toEqual(payload);
    });
  });

  it('getPublicExercise never selects the solution column', async () => {
    findUnique.mockResolvedValue({
      id: exerciseId,
      type: ExerciseType.multiple_choice,
      order: 0,
      payload: { options: ['a', 'b'] },
    });

    const result = await service.getPublicExercise(exerciseId);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, type: true, order: true, payload: true },
      }),
    );
    expect(result).not.toHaveProperty('solution');
  });
});
