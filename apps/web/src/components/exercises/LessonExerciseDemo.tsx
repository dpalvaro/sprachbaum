'use client';

import { useState } from 'react';
import type { PublicExercise } from '../../lib/types';
import { MultipleChoice } from './MultipleChoice';

/**
 * Envoltorio mínimo del futuro ExerciseRunner (issue 39): hoy solo sabe
 * mostrar un ejercicio y reaccionar a "continuar". Cuando existan más tipos,
 * este es el sitio donde entra el `switch(exercise.type)`.
 */
export function LessonExerciseDemo({ exercise }: { exercise: PublicExercise }) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink">
          Fin del slice de demostración.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Aquí es donde el runner de lección (issue 39) encadenaría el siguiente
          ejercicio de la sección.
        </p>
      </div>
    );
  }

  switch (exercise.type) {
    case 'multiple_choice':
      return (
        <MultipleChoice exercise={exercise} onAdvance={() => setDone(true)} />
      );
    default:
      return (
        <p className="text-sm text-ink-muted">
          Tipo de ejercicio &quot;{exercise.type}&quot; sin componente todavía.
        </p>
      );
  }
}
