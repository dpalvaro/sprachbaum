import { z } from 'zod';

/**
 * Por ahora solo se valida la forma de respuesta de multiple_choice: es el
 * único tipo con corrección implementada en este slice. Cuando se añadan los
 * otros cinco tipos, esto pasa a una unión discriminada por el `type` del
 * ejercicio, igual que ExerciseSchema en content-schema.
 */
export const SubmitAttemptSchema = z.object({
  answer: z.object({
    selectedIndices: z.array(z.number().int().nonnegative()).min(1),
  }),
  latencyMs: z.number().int().nonnegative(),
});

export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>;
