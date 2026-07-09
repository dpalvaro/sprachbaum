import { describe, expect, it } from 'vitest';
import { ExerciseSchema } from '../src/exercise';
import { LocalizedTextSchema } from '../src/localized-text';

describe('LocalizedText', () => {
  it('rejects an object with neither locale present', () => {
    expect(LocalizedTextSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a single locale', () => {
    expect(LocalizedTextSchema.safeParse({ es: 'hola' }).success).toBe(true);
  });
});

describe('multiple_choice coherence', () => {
  const base = {
    slug: 'ex-01',
    type: 'multiple_choice' as const,
    prompt: { es: '¿?' },
    options: ['bin', 'bist'],
  };

  it('accepts correctIndices within range', () => {
    expect(
      ExerciseSchema.safeParse({ ...base, correctIndices: [1] }).success,
    ).toBe(true);
  });

  it('rejects correctIndices out of range', () => {
    const result = ExerciseSchema.safeParse({ ...base, correctIndices: [5] });
    expect(result.success).toBe(false);
  });
});

describe('sentence_order coherence', () => {
  const base = {
    slug: 'ex-02',
    type: 'sentence_order' as const,
    prompt: { es: '¿?' },
    fragments: ['Anna', 'bin', 'ich'],
  };

  it('accepts a valid permutation of fragment indices', () => {
    expect(
      ExerciseSchema.safeParse({ ...base, correctOrder: [2, 1, 0] }).success,
    ).toBe(true);
  });

  it('rejects an out-of-range index', () => {
    expect(
      ExerciseSchema.safeParse({ ...base, correctOrder: [0, 1, 3] }).success,
    ).toBe(false);
  });

  it('rejects a repeated index', () => {
    expect(
      ExerciseSchema.safeParse({ ...base, correctOrder: [0, 0, 1] }).success,
    ).toBe(false);
  });

  it('rejects an incomplete order', () => {
    expect(
      ExerciseSchema.safeParse({ ...base, correctOrder: [0, 1] }).success,
    ).toBe(false);
  });
});
