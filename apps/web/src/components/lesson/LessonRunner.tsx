'use client';

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { completeLesson } from '../../lib/api';
import {
  buildRunnableSections,
  initialRunnerState,
  lessonRunnerReducer,
  makeExerciseResult,
  summarize,
} from '../../lib/lesson-runner';
import type { PublicLesson } from '../../lib/types';
import { CoverScreen } from './CoverScreen';
import { ExerciseScreen } from './ExerciseScreen';
import { SummaryScreen } from './SummaryScreen';
import { TheoryScreen } from './TheoryScreen';

/**
 * Orquesta portada → (teoría → ejercicios) por sección → resumen para las
 * secciones grammar/vocabulary de una lección (issue #39). No persiste
 * progreso: todo el estado vive en este useReducer y se pierde al recargar —
 * la persistencia depende de un userId real (E2/auth), aplazada.
 */
export function LessonRunner({ lesson }: { lesson: PublicLesson }) {
  const sections = useMemo(() => buildRunnableSections(lesson), [lesson]);
  const [state, dispatch] = useReducer(
    lessonRunnerReducer,
    sections,
    initialRunnerState,
  );

  const current = state.sections[state.sectionIndex];

  // Dispara la generación de SrsCard (E5) en cuanto se llega al resumen. El
  // ref evita reintentos en re-renders: una vez enviado, no se repite aunque
  // el usuario deje la pestaña abierta en la pantalla de resumen.
  const completionSent = useRef(false);
  useEffect(() => {
    if (state.phase !== 'summary' || completionSent.current) return;
    completionSent.current = true;
    completeLesson(lesson.slug).catch(() => {
      completionSent.current = false;
    });
  }, [state.phase, lesson.slug]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-canvas px-6 py-16">
      {state.phase === 'cover' && (
        <CoverScreen
          title={lesson.title}
          objectives={lesson.objectives}
          onStart={() => dispatch({ type: 'start' })}
        />
      )}

      {state.phase === 'theory' && current && (
        <TheoryScreen
          section={current.section}
          onSkip={() => dispatch({ type: 'skip-to-exercises' })}
        />
      )}

      {state.phase === 'exercise' &&
        current &&
        (() => {
          const exercise = current.exercises[state.exerciseIndex];
          return (
            <ExerciseScreen
              exercise={exercise}
              onAdvance={(outcome) =>
                dispatch({
                  type: 'advance',
                  result: makeExerciseResult(exercise, outcome),
                })
              }
            />
          );
        })()}

      {state.phase === 'summary' && (
        <SummaryScreen summary={summarize(state.results)} />
      )}
    </main>
  );
}
