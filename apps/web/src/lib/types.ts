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

export interface SentenceOrderPayload {
  prompt: LocalizedText;
  skillTag: string | null;
  fragments: string[];
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
    }
  | {
      id: string;
      type: 'sentence_order';
      order: number;
      payload: SentenceOrderPayload;
    };

export interface GrammarExample {
  de: string;
  es?: string;
  note?: LocalizedText;
}

export interface GlossaryEntry {
  term: string;
  translation: LocalizedText;
}

export interface PublicVocabItem {
  slug: string;
  lemma: string;
  translation: LocalizedText;
  example: string | null;
  exampleTranslation: LocalizedText | null;
  audioUrl: string | null;
  partOfSpeech: string | null;
  gender: string | null;
  plural: string | null;
}

/**
 * Espeja la unión discriminada del backend (`LessonsService.PublicSection`).
 * `exercises` está normalizado en las 4 variantes (el backend ya convierte
 * `questions` de reading/listening), así que el runner siempre itera un único
 * campo sin importar el tipo de sección.
 */
export type PublicSection =
  | {
      type: 'grammar';
      slug: string;
      order: number;
      title: LocalizedText | null;
      explanation: LocalizedText;
      examples: GrammarExample[];
      exercises: PublicExercise[];
    }
  | {
      type: 'vocabulary';
      slug: string;
      order: number;
      topic: LocalizedText;
      items: PublicVocabItem[];
      exercises: PublicExercise[];
    }
  | {
      type: 'reading';
      slug: string;
      order: number;
      title: LocalizedText | null;
      text: string;
      glossary: GlossaryEntry[];
      exercises: PublicExercise[];
    }
  | {
      type: 'listening';
      slug: string;
      order: number;
      title: LocalizedText | null;
      audioUrl: string;
      transcript: string;
      exercises: PublicExercise[];
    };

export interface PublicLesson {
  slug: string;
  title: LocalizedText;
  objectives: LocalizedText[];
  sections: PublicSection[];
}

export interface ExerciseOutcome {
  correct: boolean;
  attemptNumber: number;
}

export interface AttemptResult {
  correct: boolean;
  attemptNumber: number;
  /** Solo presente si el intento falló y ya van 2 o más fallos. number[] en
   * multiple_choice (índices correctos) y en sentence_order (correctOrder);
   * Record<blankId, string[]> (formas aceptadas) en fill_blank. */
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
