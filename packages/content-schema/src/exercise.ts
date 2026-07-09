import { z } from 'zod';
import { LocalizedTextSchema, MediaRefSchema } from './localized-text';

const exerciseBaseShape = {
  slug: z.string(),
  prompt: LocalizedTextSchema,
  skillTag: z.string().optional(),
};

const BlankSchema = z.object({
  id: z.string(),
  accept: z.array(z.string()).min(1),
  caseSensitive: z.boolean().optional(),
});

// TODO(#16): validar que cada hueco marcado en `text` (p. ej. "___") tiene un
// `Blank.id` correspondiente en `blanks` y viceversa. Aplazado a validación
// pedagógica cruzada (docs/content-schema-design.md §6), no implementado en v1.
export const FillBlankExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('fill_blank'),
  text: z.string(),
  blanks: z.array(BlankSchema).min(1),
});

export const MultipleChoiceExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('multiple_choice'),
  options: z.union([
    z.array(z.string()).min(1),
    z.array(LocalizedTextSchema).min(1),
  ]),
  correctIndices: z.array(z.number().int().nonnegative()).min(1),
});

export const MatchingExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('matching'),
  pairs: z
    .array(z.object({ left: z.string(), right: LocalizedTextSchema }))
    .min(1),
});

export const SentenceOrderExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('sentence_order'),
  fragments: z.array(z.string()).min(1),
  correctOrder: z.array(z.number().int().nonnegative()),
});

export const DictationExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('dictation'),
  audio: MediaRefSchema,
  expected: z.string(),
});

export const ShortAnswerExerciseSchema = z.object({
  ...exerciseBaseShape,
  type: z.literal('short_answer'),
  accept: z.array(z.string()).min(1),
  caseSensitive: z.boolean().optional(),
});

/**
 * Unión discriminada por `type`. Los seis miembros son ZodObject "planos": zod
 * exige eso para z.discriminatedUnion (no acepta ZodEffects/refine como
 * miembro), así que la coherencia solución↔enunciado (correctIndices dentro
 * de rango, correctOrder permutación válida) se valida en el .superRefine()
 * de fuera, tras resolver la unión.
 */
const ExerciseObjectSchema = z.discriminatedUnion('type', [
  FillBlankExerciseSchema,
  MultipleChoiceExerciseSchema,
  MatchingExerciseSchema,
  SentenceOrderExerciseSchema,
  DictationExerciseSchema,
  ShortAnswerExerciseSchema,
]);

export const ExerciseSchema = ExerciseObjectSchema.superRefine(
  (exercise, ctx) => {
    if (exercise.type === 'multiple_choice') {
      exercise.correctIndices.forEach((index, i) => {
        if (index >= exercise.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `correctIndices[${i}] = ${index} está fuera de rango (options tiene ${exercise.options.length} elementos)`,
            path: ['correctIndices', i],
          });
        }
      });
    }

    if (exercise.type === 'sentence_order') {
      const { correctOrder, fragments } = exercise;
      const isPermutation =
        correctOrder.length === fragments.length &&
        new Set(correctOrder).size === correctOrder.length &&
        correctOrder.every((index) => index >= 0 && index < fragments.length);
      if (!isPermutation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `correctOrder debe ser una permutación de los índices de fragments (0..${fragments.length - 1})`,
          path: ['correctOrder'],
        });
      }
    }
  },
);
export type Exercise = z.infer<typeof ExerciseSchema>;
