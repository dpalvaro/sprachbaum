import type { PublicExercise, PublicLesson, PublicSection } from './types';

/**
 * Tipos de ejercicio con corrección server-side implementada (ver
 * ExercisesService.submitAttempt). El runner filtra cualquier otro tipo de su
 * recorrido — se documenta explícitamente en vez de fallar o mostrar un
 * "no disponible": esta lista crece a medida que se implemente cada
 * corrector nuevo (matching, sentence_order, short_answer, dictation).
 */
export const SUPPORTED_EXERCISE_TYPES: ReadonlySet<PublicExercise['type']> =
  new Set(['multiple_choice', 'fill_blank']);

/**
 * Alcance de esta versión del runner (issue #39): solo grammar y vocabulary.
 * reading/listening llegan con #37/#38, reutilizando este mismo runner.
 */
const RUNNABLE_SECTION_TYPES: ReadonlySet<PublicSection['type']> = new Set([
  'grammar',
  'vocabulary',
]);

export interface ExerciseResult {
  exerciseId: string;
  skillTag: string | null;
  correct: boolean;
  attemptNumber: number;
}

export interface RunnableSection {
  section: PublicSection;
  /** Ya filtrados a SUPPORTED_EXERCISE_TYPES. */
  exercises: PublicExercise[];
}

export type RunnerPhase = 'cover' | 'theory' | 'exercise' | 'summary';

export interface RunnerState {
  sections: RunnableSection[];
  sectionIndex: number;
  exerciseIndex: number;
  phase: RunnerPhase;
  results: ExerciseResult[];
}

export type RunnerAction =
  | { type: 'start' }
  | { type: 'skip-to-exercises' }
  | { type: 'advance'; result?: ExerciseResult };

export function buildRunnableSections(lesson: PublicLesson): RunnableSection[] {
  return lesson.sections
    .filter((section) => RUNNABLE_SECTION_TYPES.has(section.type))
    .map((section) => ({
      section,
      exercises: section.exercises.filter((exercise) =>
        SUPPORTED_EXERCISE_TYPES.has(exercise.type),
      ),
    }));
}

export function initialRunnerState(sections: RunnableSection[]): RunnerState {
  return {
    sections,
    sectionIndex: 0,
    exerciseIndex: 0,
    phase: 'cover',
    results: [],
  };
}

/** Tras la última pregunta de una sección: entra en la teoría de la siguiente o cierra en resumen. */
function nextAfterExercises(state: RunnerState): RunnerState {
  const nextSectionIndex = state.sectionIndex + 1;
  if (nextSectionIndex >= state.sections.length) {
    return { ...state, phase: 'summary' };
  }
  return {
    ...state,
    sectionIndex: nextSectionIndex,
    exerciseIndex: 0,
    phase: 'theory',
  };
}

export function lessonRunnerReducer(
  state: RunnerState,
  action: RunnerAction,
): RunnerState {
  switch (action.type) {
    case 'start': {
      if (state.sections.length === 0) {
        return { ...state, phase: 'summary' };
      }
      return { ...state, phase: 'theory', sectionIndex: 0, exerciseIndex: 0 };
    }
    case 'skip-to-exercises': {
      const current = state.sections[state.sectionIndex];
      // Sección sin ejercicios corregibles tras el filtrado: no hay pantalla
      // de ejercicio que mostrar, se sigue directo a la siguiente teoría o al
      // resumen, sin pantalla vacía.
      if (!current || current.exercises.length === 0) {
        return nextAfterExercises(state);
      }
      return { ...state, phase: 'exercise', exerciseIndex: 0 };
    }
    case 'advance': {
      const withResult: RunnerState = action.result
        ? { ...state, results: [...state.results, action.result] }
        : state;
      const current = withResult.sections[withResult.sectionIndex];
      const nextExerciseIndex = withResult.exerciseIndex + 1;
      if (current && nextExerciseIndex < current.exercises.length) {
        return { ...withResult, exerciseIndex: nextExerciseIndex };
      }
      return nextAfterExercises(withResult);
    }
    default:
      return state;
  }
}

export function makeExerciseResult(
  exercise: PublicExercise,
  outcome: { correct: boolean; attemptNumber: number },
): ExerciseResult {
  return {
    exerciseId: exercise.id,
    skillTag: exercise.payload.skillTag,
    correct: outcome.correct,
    attemptNumber: outcome.attemptNumber,
  };
}

export interface SkillBreakdown {
  skillTag: string;
  correct: number;
  total: number;
}

export interface RunnerSummary {
  correct: number;
  total: number;
  bySkill: SkillBreakdown[];
}

export function summarize(results: ExerciseResult[]): RunnerSummary {
  const bySkillMap = new Map<string, { correct: number; total: number }>();
  for (const result of results) {
    const key = result.skillTag ?? 'general';
    const entry = bySkillMap.get(key) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (result.correct) entry.correct += 1;
    bySkillMap.set(key, entry);
  }

  return {
    correct: results.filter((r) => r.correct).length,
    total: results.length,
    bySkill: Array.from(bySkillMap.entries()).map(([skillTag, value]) => ({
      skillTag,
      ...value,
    })),
  };
}
