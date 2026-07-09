import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { LessonSchema, type Lesson } from './lesson';

export function parseLessonYaml(raw: string): Lesson {
  return LessonSchema.parse(parse(raw));
}

export function loadLessonFile(path: string): Lesson {
  return parseLessonYaml(readFileSync(path, 'utf-8'));
}
