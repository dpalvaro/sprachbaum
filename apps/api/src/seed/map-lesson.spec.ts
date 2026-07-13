import { LessonSchema } from '@sprachbaum/content-schema';
import { buildLessonPlan } from './map-lesson';

function buildLesson() {
  return LessonSchema.parse({
    slug: 'a1-l00-test',
    level: 'A1',
    order: 1,
    title: { es: 'Test' },
    objectives: [{ es: 'obj' }],
    sections: [
      {
        type: 'grammar',
        slug: 'l00-grammar-sein',
        title: { es: 'Grammar' },
        explanation: { es: 'exp' },
        examples: [{ de: 'Ich bin.', es: 'Yo soy.' }],
        exercises: [
          {
            slug: 'l00-fill',
            type: 'fill_blank',
            prompt: { es: 'p' },
            text: 'Ich ___.',
            blanks: [{ id: 'b1', accept: ['bin'] }],
            skillTag: 'grammar:sein',
          },
          {
            slug: 'l00-mc',
            type: 'multiple_choice',
            prompt: { es: 'p' },
            options: ['bin', 'bist'],
            correctIndices: [0],
          },
          {
            slug: 'l00-match',
            type: 'matching',
            prompt: { es: 'p' },
            pairs: [
              { left: 'hallo', right: { es: 'hola' } },
              { left: 'danke', right: { es: 'gracias' } },
            ],
          },
          {
            slug: 'l00-order',
            type: 'sentence_order',
            prompt: { es: 'p' },
            fragments: ['Anna', 'bin', 'ich'],
            correctOrder: [2, 1, 0],
          },
          {
            slug: 'l00-dictation',
            type: 'dictation',
            prompt: { es: 'p' },
            audio: { url: 'a.mp3' },
            expected: 'Ich bin Anna.',
          },
          {
            slug: 'l00-short',
            type: 'short_answer',
            prompt: { es: 'p' },
            accept: ['ja'],
          },
        ],
      },
      {
        type: 'vocabulary',
        slug: 'l00-vocab-greetings',
        topic: { es: 'Saludos' },
        items: [
          {
            slug: 'voc-hallo',
            lemma: 'hallo',
            translation: { es: 'hola' },
            gender: 'der',
            partOfSpeech: 'noun',
          },
          { slug: 'voc-danke', lemma: 'danke', translation: { es: 'gracias' } },
        ],
        exercises: [],
      },
      {
        type: 'reading',
        slug: 'l00-reading',
        text: 'Hallo Welt.',
        glossary: [{ term: 'Welt', translation: { es: 'mundo' } }],
        questions: [
          {
            slug: 'l00-read-q1',
            type: 'short_answer',
            prompt: { es: 'p' },
            accept: ['si'],
          },
        ],
      },
      {
        type: 'listening',
        slug: 'l00-listening',
        audio: { url: 'l.mp3' },
        transcript: 'Hallo.',
        questions: [
          {
            slug: 'l00-listen-q1',
            type: 'short_answer',
            prompt: { es: 'p' },
            accept: ['si'],
          },
        ],
      },
    ],
  });
}

describe('buildLessonPlan', () => {
  const plan = buildLessonPlan(buildLesson());

  it('carries lesson-level fields through', () => {
    expect(plan.slug).toBe('a1-l00-test');
    expect(plan.levelCode).toBe('A1');
    expect(plan.order).toBe(1);
  });

  it('derives one skill per section, keyed by (type, section.slug)', () => {
    const bySlug = new Map(plan.sections.map((s) => [s.slug, s]));
    expect(bySlug.get('l00-grammar-sein')).toMatchObject({
      skillType: 'GRAMMAR',
      skillName: 'l00-grammar-sein',
    });
    expect(bySlug.get('l00-vocab-greetings')).toMatchObject({
      skillType: 'VOCAB_TOPIC',
      skillName: 'l00-vocab-greetings',
    });
    expect(bySlug.get('l00-reading')).toMatchObject({
      skillType: 'READING',
      skillName: 'l00-reading',
    });
    expect(bySlug.get('l00-listening')).toMatchObject({
      skillType: 'LISTENING',
      skillName: 'l00-listening',
    });
  });

  it('drops title for vocabulary sections and keeps it for the rest', () => {
    const bySlug = new Map(plan.sections.map((s) => [s.slug, s]));
    expect(bySlug.get('l00-vocab-greetings')?.title).toBeNull();
    expect(bySlug.get('l00-grammar-sein')?.title).toEqual({ es: 'Grammar' });
  });

  it('builds section content per type', () => {
    const bySlug = new Map(plan.sections.map((s) => [s.slug, s]));
    expect(bySlug.get('l00-grammar-sein')?.content).toMatchObject({
      explanation: { es: 'exp' },
      examples: [{ de: 'Ich bin.', es: 'Yo soy.' }],
    });
    expect(bySlug.get('l00-vocab-greetings')?.content).toEqual({
      topic: { es: 'Saludos' },
    });
    expect(bySlug.get('l00-reading')?.content).toMatchObject({
      text: 'Hallo Welt.',
      glossary: [{ term: 'Welt', translation: { es: 'mundo' } }],
    });
    expect(bySlug.get('l00-listening')?.content).toMatchObject({
      audio: { url: 'l.mp3' },
      transcript: 'Hallo.',
    });
  });

  it('maps vocabulary items to the vocabulary section, defaulting optional fields to null', () => {
    expect(plan.vocabItems).toHaveLength(2);
    expect(plan.vocabItems[0]).toMatchObject({
      slug: 'voc-hallo',
      sectionSlug: 'l00-vocab-greetings',
      gender: 'der',
      partOfSpeech: 'noun',
    });
    expect(plan.vocabItems[1]).toMatchObject({
      slug: 'voc-danke',
      example: null,
      audioUrl: null,
      gender: null,
      partOfSpeech: null,
    });
  });

  it('collects exercises from both `exercises` and `questions` arrays', () => {
    const slugs = plan.exercises.map((e) => e.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'l00-fill',
        'l00-mc',
        'l00-match',
        'l00-order',
        'l00-dictation',
        'l00-short',
        'l00-read-q1',
        'l00-listen-q1',
      ]),
    );
  });

  describe('payload/solution split', () => {
    const bySlug = new Map(plan.exercises.map((e) => [e.slug, e]));

    it('fill_blank: strips accept from payload, keeps it in solution', () => {
      const ex = bySlug.get('l00-fill')!;
      expect(ex.payload).toMatchObject({
        text: 'Ich ___.',
        blanks: [{ id: 'b1' }],
      });
      expect(
        (ex.payload as { blanks: unknown[] }).blanks[0],
      ).not.toHaveProperty('accept');
      expect(ex.solution).toEqual({ blanks: [{ id: 'b1', accept: ['bin'] }] });
    });

    it('multiple_choice: keeps options in payload, correctIndices only in solution', () => {
      const ex = bySlug.get('l00-mc')!;
      expect(ex.payload).toMatchObject({ options: ['bin', 'bist'] });
      expect(ex.payload).not.toHaveProperty('correctIndices');
      expect(ex.solution).toEqual({ correctIndices: [0] });
    });

    it('matching: payload keeps lefts/rights in canonical (pairs) order — the anti-alignment shuffle happens per request, not at seed time', () => {
      // Ver ExercisesService.shuffleMatchingRights: el barajado real (para que
      // ninguna carga de la lección repita el mismo orden) ocurre en cada
      // respuesta del servidor, no aquí. El seed guarda el orden canónico y
      // la corrección compara por valor, así que este orden es irrelevante
      // para la corrección — solo importa que exista un shuffle dinámico
      // aguas abajo.
      const ex = bySlug.get('l00-match')!;
      const payload = ex.payload as { lefts: string[]; rights: unknown[] };
      expect(payload.lefts).toEqual(['hallo', 'danke']);
      expect(payload.rights).toEqual([{ es: 'hola' }, { es: 'gracias' }]);
      expect(ex.solution).toEqual({
        pairs: [
          { left: 'hallo', right: { es: 'hola' } },
          { left: 'danke', right: { es: 'gracias' } },
        ],
      });
    });

    it('sentence_order: fragments stay in payload as-authored, correctOrder only in solution', () => {
      const ex = bySlug.get('l00-order')!;
      expect(ex.payload).toMatchObject({ fragments: ['Anna', 'bin', 'ich'] });
      expect(ex.solution).toEqual({ correctOrder: [2, 1, 0] });
    });

    it('dictation: expected only in solution', () => {
      const ex = bySlug.get('l00-dictation')!;
      expect(ex.payload).toMatchObject({ audio: { url: 'a.mp3' } });
      expect(ex.payload).not.toHaveProperty('expected');
      expect(ex.solution).toEqual({ expected: 'Ich bin Anna.' });
    });

    it('short_answer: accept only in solution, defaults caseSensitive to false', () => {
      const ex = bySlug.get('l00-short')!;
      expect(ex.payload).not.toHaveProperty('accept');
      expect(ex.solution).toEqual({ accept: ['ja'], caseSensitive: false });
    });

    it('preserves the raw skillTag in payload as metadata, defaulting to null', () => {
      expect(bySlug.get('l00-fill')?.payload).toMatchObject({
        skillTag: 'grammar:sein',
      });
      expect(bySlug.get('l00-mc')?.payload).toMatchObject({ skillTag: null });
    });
  });
});
