import { z } from 'zod';

/** Objeto multilingüe: al menos un locale debe estar presente (docs/content-schema-design.md §2). */
export const LocalizedTextSchema = z
  .object({
    es: z.string().optional(),
    de: z.string().optional(),
  })
  .refine((value) => value.es !== undefined || value.de !== undefined, {
    message: 'LocalizedText requiere al menos un locale (es o de)',
  });
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const MediaRefSchema = z.object({
  url: z.string(),
  durationSec: z.number().positive().optional(),
  transcriptSlug: z.string().optional(),
});
export type MediaRef = z.infer<typeof MediaRefSchema>;
