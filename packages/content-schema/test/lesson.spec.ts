import { describe, expect, it } from 'vitest';
import { LessonSchema } from '../src/lesson';

function buildLesson(overrides: {
  sectionSlugs?: [string, string];
  exerciseSlugs?: [string, string];
  vocabSlugs?: [string, string];
}) {
  const [sectionSlug1, sectionSlug2] = overrides.sectionSlugs ?? [
    'sec-1',
    'sec-2',
  ];
  const [exerciseSlug1, exerciseSlug2] = overrides.exerciseSlugs ?? [
    'ex-1',
    'ex-2',
  ];
  const [vocabSlug1, vocabSlug2] = overrides.vocabSlugs ?? ['voc-1', 'voc-2'];

  return {
    slug: 'a1-l00-test',
    level: 'A1',
    order: 1,
    title: { es: 'Test' },
    objectives: [{ es: 'obj' }],
    sections: [
      {
        type: 'grammar',
        slug: sectionSlug1,
        explanation: { es: 'exp' },
        examples: [],
        exercises: [
          {
            slug: exerciseSlug1,
            type: 'short_answer',
            prompt: { es: 'p' },
            accept: ['a'],
          },
        ],
      },
      {
        type: 'vocabulary',
        slug: sectionSlug2,
        topic: { es: 'topic' },
        items: [
          { slug: vocabSlug1, lemma: 'x', translation: { es: 'y' } },
          { slug: vocabSlug2, lemma: 'z', translation: { es: 'w' } },
        ],
        exercises: [
          {
            slug: exerciseSlug2,
            type: 'short_answer',
            prompt: { es: 'p' },
            accept: ['a'],
          },
        ],
      },
    ],
  };
}

describe('Lesson slug uniqueness', () => {
  it('accepts a lesson with all-unique slugs', () => {
    expect(LessonSchema.safeParse(buildLesson({})).success).toBe(true);
  });

  it('rejects duplicate section slugs', () => {
    expect(
      LessonSchema.safeParse(buildLesson({ sectionSlugs: ['sec-1', 'sec-1'] }))
        .success,
    ).toBe(false);
  });

  it('rejects duplicate exercise slugs across different sections', () => {
    expect(
      LessonSchema.safeParse(buildLesson({ exerciseSlugs: ['ex-1', 'ex-1'] }))
        .success,
    ).toBe(false);
  });

  it('rejects duplicate vocab item slugs', () => {
    expect(
      LessonSchema.safeParse(buildLesson({ vocabSlugs: ['voc-1', 'voc-1'] }))
        .success,
    ).toBe(false);
  });
});
