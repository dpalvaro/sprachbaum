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

export interface FillBlankPayload {
  prompt: LocalizedText;
  skillTag: string | null;
  text: string;
  blanks: { id: string }[];
}

export type PublicExercise =
  | {
      id: string;
      type: 'multiple_choice';
      order: number;
      payload: MultipleChoicePayload;
    }
  | {
      id: string;
      type: 'fill_blank';
      order: number;
      payload: FillBlankPayload;
    };

export interface AttemptResult {
  correct: boolean;
  attemptNumber: number;
  /** Solo presente si el intento falló y ya van 2 o más fallos. number[] en
   * multiple_choice (índices correctos); Record<blankId, string[]> (formas
   * aceptadas) en fill_blank. */
  revealedSolution?: number[] | Record<string, string[]>;
  /** Solo presente si el intento fue correcto y difería ortográficamente de la
   * forma canónica (equivalencia ä/ö/ü/ß). Hoy solo lo rellena fill_blank. */
  canonicalAnswers?: Record<string, string>;
}

export function resolveText(
  value: LocalizedText,
  locale: 'es' | 'de' = 'es',
): string {
  return value[locale] ?? value.es ?? value.de ?? '';
}
