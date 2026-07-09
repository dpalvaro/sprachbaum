import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLessonFile } from '../src/load';

const FIXTURE_PATH = path.join(
  __dirname,
  '../../../content/de/a1/a1-l01-hallo.yaml',
);

describe('a1-l01-hallo.yaml (gold standard)', () => {
  it('parses and validates against the Lesson schema', () => {
    const lesson = loadLessonFile(FIXTURE_PATH);

    expect(lesson.slug).toBe('a1-l01-hallo');
    expect(lesson.level).toBe('A1');
    expect(lesson.order).toBe(1);
    expect(lesson.objectives).toHaveLength(3);
    expect(lesson.sections.map((section) => section.type)).toEqual([
      'grammar',
      'vocabulary',
      'reading',
      'listening',
    ]);

    const [grammar, vocabulary, reading, listening] = lesson.sections;
    if (grammar?.type !== 'grammar')
      throw new Error('expected grammar section');
    if (vocabulary?.type !== 'vocabulary')
      throw new Error('expected vocabulary section');
    if (reading?.type !== 'reading')
      throw new Error('expected reading section');
    if (listening?.type !== 'listening')
      throw new Error('expected listening section');

    expect(grammar.exercises).toHaveLength(10);
    expect(vocabulary.items).toHaveLength(14);
    expect(vocabulary.exercises).toHaveLength(10);
    expect(reading.questions).toHaveLength(5);
    expect(listening.questions).toHaveLength(5);
  });
});
