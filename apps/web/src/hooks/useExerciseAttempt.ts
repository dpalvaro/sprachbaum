'use client';

import { useCallback, useRef, useState } from 'react';
import type { AttemptStatus } from '../components/ui/exercise-feedback';
import { submitAttempt } from '../lib/api';
import type { AttemptResult } from '../lib/types';

export type { AttemptStatus };

type Answer =
  { selectedIndices: number[] } | { values: Record<string, string> };

/**
 * Estado + llamada de red compartidos por cualquier tipo de ejercicio: mide
 * latencia desde que se muestra el ejercicio, envía el intento, y traduce la
 * respuesta del servidor a un estado de UI. Cada componente de ejercicio solo
 * aporta la forma de `answer` (`selectedIndices` en multiple_choice, `values`
 * en fill_blank); cuando lleguen los otros tipos, este hook es lo que
 * reutilizan en vez de reimplementar el POST.
 */
export function useExerciseAttempt(exerciseId: string) {
  const [status, setStatus] = useState<AttemptStatus>('answering');
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());

  const submit = useCallback(
    async (answer: Answer) => {
      setStatus('submitting');
      setError(null);
      try {
        const latencyMs = Date.now() - shownAt.current;
        const result = await submitAttempt(exerciseId, {
          answer,
          latencyMs,
        });
        setLastResult(result);
        setStatus(
          result.correct
            ? 'correct'
            : result.revealedSolution
              ? 'revealed'
              : 'retry',
        );
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
        setStatus('answering');
        throw e;
      }
    },
    [exerciseId],
  );

  const retryAnswering = useCallback(() => {
    shownAt.current = Date.now();
    setStatus('answering');
    setError(null);
  }, []);

  return { status, lastResult, error, submit, retryAnswering };
}
