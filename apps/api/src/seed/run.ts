import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadLessonFile } from '@sprachbaum/content-schema';
import { buildLessonPlan } from './map-lesson';
import { seedDevUser } from './seed-dev-user';
import { seedLesson } from './seed-lesson';

const DEFAULT_CONTENT_DIR = resolve(__dirname, '../../../../content/de/a1');

function listLessonFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .sort()
    .map((file) => join(dir, file));
}

/** Lee, valida y hace upsert idempotente de cada lección YAML en `contentDir`. */
export async function run(
  contentDir: string = DEFAULT_CONTENT_DIR,
): Promise<void> {
  const files = listLessonFiles(contentDir);
  if (files.length === 0) {
    throw new Error(`No se encontró contenido YAML en ${contentDir}`);
  }

  const prisma = new PrismaClient();
  try {
    await seedDevUser(prisma);
    for (const file of files) {
      const lesson = loadLessonFile(file);
      const plan = buildLessonPlan(lesson);
      await seedLesson(prisma, plan);
      console.log(
        `✔ ${plan.slug} (${plan.sections.length} secciones, ${plan.exercises.length} ejercicios, ${plan.vocabItems.length} vocab items)`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
