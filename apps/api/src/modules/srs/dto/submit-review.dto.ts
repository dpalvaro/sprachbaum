import { z } from 'zod';

export const SubmitReviewSchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  latencyMs: z.number().int().nonnegative(),
});

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
