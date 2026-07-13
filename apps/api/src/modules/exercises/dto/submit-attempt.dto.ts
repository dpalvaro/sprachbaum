import { z } from 'zod';

/**
 * Unión discriminada por la forma de `answer`, no por el `type` del ejercicio
 * (el controller no conoce el tipo hasta que el servicio carga el ejercicio).
 * El servicio valida que la forma recibida corresponda al `type` real antes de
 * corregir. Cuando se añada dictation (el único tipo restante), suma un
 * miembro aquí.
 */
const AnswerSchema = z.union([
  z.object({
    selectedIndices: z.array(z.number().int().nonnegative()).min(1),
  }),
  z.object({
    values: z.record(z.string(), z.string()),
  }),
  z.object({
    order: z.array(z.number().int().nonnegative()).min(1),
  }),
  z.object({
    value: z.string(),
  }),
  z.object({
    matches: z.record(z.string(), z.string()),
  }),
]);

export const SubmitAttemptSchema = z.object({
  answer: AnswerSchema,
  latencyMs: z.number().int().nonnegative(),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
