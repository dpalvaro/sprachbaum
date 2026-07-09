import { z } from 'zod';
import { LocalizedTextSchema, MediaRefSchema } from './localized-text';
import { ExerciseSchema } from './exercise';

const GrammarExampleSchema = z.object({
  de: z.string(),
  es: z.string().optional(),
  note: LocalizedTextSchema.optional(),
});

export const GrammarSectionSchema = z.object({
  type: z.literal('grammar'),
  slug: z.string(),
  title: LocalizedTextSchema.optional(),
  explanation: LocalizedTextSchema,
  examples: z.array(GrammarExampleSchema),
  exercises: z.array(ExerciseSchema),
});

export const VocabItemSchema = z.object({
  slug: z.string(),
  lemma: z.string(),
  translation: LocalizedTextSchema,
  example: z.string().optional(),
  exampleTranslation: LocalizedTextSchema.optional(),
  audio: MediaRefSchema.optional(),
  partOfSpeech: z
    .enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'])
    .optional(),
  gender: z.enum(['der', 'die', 'das']).optional(),
  plural: z.string().optional(),
});
export type VocabItem = z.infer<typeof VocabItemSchema>;

export const VocabularySectionSchema = z.object({
  type: z.literal('vocabulary'),
  slug: z.string(),
  topic: LocalizedTextSchema,
  items: z.array(VocabItemSchema),
  exercises: z.array(ExerciseSchema),
});

const GlossaryEntrySchema = z.object({
  term: z.string(),
  translation: LocalizedTextSchema,
});

export const ReadingSectionSchema = z.object({
  type: z.literal('reading'),
  slug: z.string(),
  title: LocalizedTextSchema.optional(),
  text: z.string(),
  glossary: z.array(GlossaryEntrySchema),
  questions: z.array(ExerciseSchema),
});

export const ListeningSectionSchema = z.object({
  type: z.literal('listening'),
  slug: z.string(),
  title: LocalizedTextSchema.optional(),
  audio: MediaRefSchema,
  transcript: z.string(),
  questions: z.array(ExerciseSchema),
});

export const SectionSchema = z.discriminatedUnion('type', [
  GrammarSectionSchema,
  VocabularySectionSchema,
  ReadingSectionSchema,
  ListeningSectionSchema,
]);
export type Section = z.infer<typeof SectionSchema>;
