export interface LocalizedText {
  es?: string;
  de?: string;
}

export interface ExerciseListItem {
  id: string;
  type: string;
  order: number;
}

export interface MultipleChoicePayload {
  prompt: LocalizedText;
  skillTag: string | null;
  options: (string | LocalizedText)[];
}

export interface PublicExercise {
  id: string;
  type: string;
  order: number;
  payload: MultipleChoicePayload;
}

export interface AttemptResult {
  correct: boolean;
  attemptNumber: number;
  /** Solo presente si el intento falló y ya van 2 o más fallos. */
  revealedSolution?: number[];
}

export function resolveText(
  value: LocalizedText,
  locale: 'es' | 'de' = 'es',
): string {
  return value[locale] ?? value.es ?? value.de ?? '';
}
