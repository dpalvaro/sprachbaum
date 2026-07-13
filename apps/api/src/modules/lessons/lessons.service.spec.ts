import { NotFoundException } from '@nestjs/common';
import { SectionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LessonsService } from './lessons.service';

/** Forma mínima del argumento de `prisma.lesson.findUnique` que este spec
 * necesita inspeccionar (el select anidado hasta `exercises`), para poder
 * tipar `findUnique.mock.calls` sin recurrir a `any`. */
interface LessonFindUniqueArgs {
  select: {
    sections: {
      select: {
        exercises: {
          select: Record<string, boolean>;
        };
      };
    };
  };
}

describe('LessonsService', () => {
  let findUnique: jest.Mock<Promise<unknown>, [LessonFindUniqueArgs]>;
  let prisma: PrismaService;
  let service: LessonsService;

  beforeEach(() => {
    findUnique = jest.fn<Promise<unknown>, [LessonFindUniqueArgs]>();
    prisma = { lesson: { findUnique } } as unknown as PrismaService;
    service = new LessonsService(prisma);
  });

  it('throws NotFoundException when the lesson does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.getLessonBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('never selects the solution column of exercises', async () => {
    findUnique.mockResolvedValue({
      slug: 'a1-l01-hallo',
      title: { es: 'Hallo' },
      objectives: [{ es: 'Saludar' }],
      sections: [],
    });

    await service.getLessonBySlug('a1-l01-hallo');

    const call = findUnique.mock.calls[0][0];
    expect(call.select.sections.select.exercises.select).toEqual({
      id: true,
      type: true,
      order: true,
      payload: true,
    });
  });

  it('maps a grammar section: explanation, examples and exercises, no vocab items', async () => {
    findUnique.mockResolvedValue({
      slug: 'a1-l01-hallo',
      title: { es: 'Hallo' },
      objectives: [{ es: 'Saludar' }],
      sections: [
        {
          slug: 'l01-grammar-sein',
          type: SectionType.grammar,
          order: 0,
          title: null,
          content: {
            explanation: { es: 'El verbo sein...' },
            examples: [{ de: 'Ich bin', es: 'Yo soy' }],
          },
          vocabItems: [],
          exercises: [
            { id: 'ex-1', type: 'multiple_choice', order: 0, payload: {} },
          ],
        },
      ],
    });

    const lesson = await service.getLessonBySlug('a1-l01-hallo');

    expect(lesson.sections[0]).toEqual({
      type: 'grammar',
      slug: 'l01-grammar-sein',
      order: 0,
      title: null,
      explanation: { es: 'El verbo sein...' },
      examples: [{ de: 'Ich bin', es: 'Yo soy' }],
      exercises: [
        { id: 'ex-1', type: 'multiple_choice', order: 0, payload: {} },
      ],
    });
  });

  it('maps a vocabulary section: topic, items (from VocabItem rows) and exercises', async () => {
    findUnique.mockResolvedValue({
      slug: 'a1-l01-hallo',
      title: { es: 'Hallo' },
      objectives: [{ es: 'Saludar' }],
      sections: [
        {
          slug: 'l01-vocab-greetings',
          type: SectionType.vocabulary,
          order: 1,
          title: null,
          content: { topic: { es: 'Saludos' } },
          vocabItems: [
            {
              slug: 'v-hallo',
              lemma: 'Hallo',
              translation: { es: 'Hola' },
              example: 'Hallo!',
              exampleTranslation: { es: '¡Hola!' },
              audioUrl: null,
              partOfSpeech: 'phrase',
              gender: null,
              plural: null,
            },
          ],
          exercises: [],
        },
      ],
    });

    const lesson = await service.getLessonBySlug('a1-l01-hallo');

    expect(lesson.sections[0]).toEqual({
      type: 'vocabulary',
      slug: 'l01-vocab-greetings',
      order: 1,
      topic: { es: 'Saludos' },
      items: [
        {
          slug: 'v-hallo',
          lemma: 'Hallo',
          translation: { es: 'Hola' },
          example: 'Hallo!',
          exampleTranslation: { es: '¡Hola!' },
          audioUrl: null,
          partOfSpeech: 'phrase',
          gender: null,
          plural: null,
        },
      ],
      exercises: [],
    });
  });

  it("shuffles matching payload.rights (as a permutation) within a section's exercises", async () => {
    const rights = [
      { es: 'hola' },
      { es: 'gracias' },
      { es: 'adiós' },
      { es: 'por favor' },
      { es: 'buenos días' },
      { es: 'buenas noches' },
    ];
    findUnique.mockResolvedValue({
      slug: 'a1-l01-hallo',
      title: { es: 'Hallo' },
      objectives: [{ es: 'Saludar' }],
      sections: [
        {
          slug: 'l01-vocab-greetings',
          type: SectionType.vocabulary,
          order: 1,
          title: null,
          content: { topic: { es: 'Saludos' } },
          vocabItems: [],
          exercises: [
            {
              id: 'ex-matching',
              type: 'matching',
              order: 0,
              payload: {
                lefts: ['a', 'b', 'c', 'd', 'e', 'f'],
                rights,
              },
            },
          ],
        },
      ],
    });

    const lesson = await service.getLessonBySlug('a1-l01-hallo');

    const exercise = lesson.sections[0].exercises[0] as {
      payload: { lefts: string[]; rights: { es: string }[] };
    };
    expect(exercise.payload.lefts).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(exercise.payload.rights).toHaveLength(rights.length);
    expect(
      [...exercise.payload.rights].sort((x, y) => x.es.localeCompare(y.es)),
    ).toEqual([...rights].sort((x, y) => x.es.localeCompare(y.es)));
  });

  it('normalizes reading/listening "questions" to "exercises" on the wire', async () => {
    findUnique.mockResolvedValue({
      slug: 'a1-l01-hallo',
      title: { es: 'Hallo' },
      objectives: [{ es: 'Saludar' }],
      sections: [
        {
          slug: 'l01-reading-gespraech',
          type: SectionType.reading,
          order: 2,
          title: { es: 'Diálogo' },
          content: { text: 'Hallo!', glossary: [] },
          vocabItems: [],
          exercises: [
            { id: 'ex-2', type: 'multiple_choice', order: 0, payload: {} },
          ],
        },
        {
          slug: 'l01-listening-begruessungen',
          type: SectionType.listening,
          order: 3,
          title: { es: 'Audio' },
          content: {
            audio: { url: 'https://example.test/a.mp3' },
            transcript: 'Hallo!',
          },
          vocabItems: [],
          exercises: [],
        },
      ],
    });

    const lesson = await service.getLessonBySlug('a1-l01-hallo');

    expect(lesson.sections[0]).toMatchObject({
      type: 'reading',
      text: 'Hallo!',
      exercises: [
        { id: 'ex-2', type: 'multiple_choice', order: 0, payload: {} },
      ],
    });
    expect(lesson.sections[1]).toMatchObject({
      type: 'listening',
      audioUrl: 'https://example.test/a.mp3',
      transcript: 'Hallo!',
    });
  });
});
