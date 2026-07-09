import { z } from 'zod';
import { LocalizedTextSchema } from './localized-text';
import { SectionSchema, type Section } from './section';

const LessonObjectSchema = z.object({
  slug: z.string(),
  level: z.string(),
  order: z.number().int().nonnegative(),
  title: LocalizedTextSchema,
  objectives: z.array(LocalizedTextSchema),
  sections: z.array(SectionSchema),
});

type SlugEntry = { slug: string; path: (string | number)[] };

/** Reporta cada slug repetido dentro de `entries` como un issue independiente, apuntando a su path exacto. */
function reportDuplicateSlugs(
  ctx: z.RefinementCtx,
  label: string,
  entries: SlugEntry[],
) {
  const firstSeenAt = new Map<string, (string | number)[]>();
  for (const entry of entries) {
    if (firstSeenAt.has(entry.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `slug de ${label} duplicado dentro de la lección: "${entry.slug}"`,
        path: entry.path,
      });
    } else {
      firstSeenAt.set(entry.slug, entry.path);
    }
  }
}

/** Los ejercicios viven en `exercises` (grammar/vocabulary) o `questions` (reading/listening). */
function exerciseEntriesOf(
  section: Section,
  sectionIndex: number,
): SlugEntry[] {
  const arrayKey =
    section.type === 'reading' || section.type === 'listening'
      ? 'questions'
      : 'exercises';
  const exercises =
    section.type === 'reading' || section.type === 'listening'
      ? section.questions
      : section.exercises;
  return exercises.map((exercise, exerciseIndex) => ({
    slug: exercise.slug,
    path: ['sections', sectionIndex, arrayKey, exerciseIndex, 'slug'],
  }));
}

export const LessonSchema = LessonObjectSchema.superRefine((lesson, ctx) => {
  reportDuplicateSlugs(
    ctx,
    'sección',
    lesson.sections.map((section, index) => ({
      slug: section.slug,
      path: ['sections', index, 'slug'],
    })),
  );

  reportDuplicateSlugs(
    ctx,
    'ejercicio',
    lesson.sections.flatMap((section, index) =>
      exerciseEntriesOf(section, index),
    ),
  );

  reportDuplicateSlugs(
    ctx,
    'vocab item',
    lesson.sections.flatMap((section, sectionIndex) =>
      section.type === 'vocabulary'
        ? section.items.map((item, itemIndex) => ({
            slug: item.slug,
            path: ['sections', sectionIndex, 'items', itemIndex, 'slug'],
          }))
        : [],
    ),
  );
});
export type Lesson = z.infer<typeof LessonSchema>;
