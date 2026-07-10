'use client';

import { useRef, useState } from 'react';
import {
  blankInputStateClasses,
  FeedbackMessage,
  PRIMARY_BUTTON,
  type BlankState,
} from '../ui/exercise-feedback';
import { GermanKeyboard } from '../ui/GermanKeyboard';
import { SupportText, TargetText } from '../ui/typography';
import { useExerciseAttempt } from '../../hooks/useExerciseAttempt';
import {
  resolveText,
  type ExerciseOutcome,
  type PublicExercise,
} from '../../lib/types';

interface FillBlankProps {
  exercise: Extract<PublicExercise, { type: 'fill_blank' }>;
  onAdvance?: (outcome: ExerciseOutcome) => void;
}

export function FillBlank({ exercise, onAdvance }: FillBlankProps) {
  const { status, lastResult, error, submit, retryAnswering } =
    useExerciseAttempt(exercise.id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { prompt, text, blanks, skillTag } = exercise.payload;
  const promptText = resolveText(prompt);
  const disabled =
    status === 'submitting' || status === 'correct' || status === 'revealed';
  const allFilled = blanks.every(
    (blank) => (values[blank.id] ?? '').trim().length > 0,
  );

  // Un único `___` por blank, emparejados por orden de aparición (la
  // convención implícita del seed hoy — content-schema aún no valida el
  // marcador↔id, ver TODO(#16) en packages/content-schema/src/exercise.ts).
  const segments = text.split(/_+/);
  const revealedSolution = lastResult?.revealedSolution as
    Record<string, string[]> | undefined;

  function blankState(): BlankState {
    if (status === 'correct') return 'correct';
    if (status === 'retry' || status === 'revealed') return 'incorrect';
    return 'idle';
  }

  function feedbackDetail(): string | undefined {
    if (status === 'correct' && lastResult?.canonicalAnswers) {
      const forms = Object.values(lastResult.canonicalAnswers);
      if (forms.length > 0) return `Se escribe: ${forms.join(', ')}`;
    }
    if (status === 'revealed' && revealedSolution) {
      const forms = blanks
        .map((blank) => revealedSolution[blank.id]?.[0])
        .filter((form): form is string => Boolean(form));
      if (forms.length > 0) return `Respuesta correcta: ${forms.join(', ')}`;
    }
    return undefined;
  }

  function insertChar(char: string) {
    if (!activeBlankId) return;
    const input = inputRefs.current[activeBlankId];
    const current = values[activeBlankId] ?? '';
    const start = input?.selectionStart ?? current.length;
    const end = input?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + char + current.slice(end);
    setValues((prev) => ({ ...prev, [activeBlankId]: next }));
    const cursor = start + char.length;
    requestAnimationFrame(() => {
      input?.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSubmit() {
    if (!allFilled) return;
    await submit({ values });
  }

  function handleRetry() {
    setValues({});
    retryAnswering();
  }

  function handleAdvance() {
    if (!lastResult) return;
    onAdvance?.({
      correct: lastResult.correct,
      attemptNumber: lastResult.attemptNumber,
    });
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-sm sm:p-8">
      {skillTag && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
          {skillTag}
        </p>
      )}
      <SupportText as="h2" className="mb-6 block text-sm">
        {promptText}
      </SupportText>

      <p className="text-xl leading-relaxed">
        {segments.map((segment, i) => {
          const blank = blanks[i];
          return (
            <span key={i}>
              <TargetText as="span">{segment}</TargetText>
              {blank && (
                <input
                  ref={(el) => {
                    inputRefs.current[blank.id] = el;
                  }}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={`Hueco ${i + 1}`}
                  value={values[blank.id] ?? ''}
                  disabled={disabled}
                  onFocus={() => setActiveBlankId(blank.id)}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      [blank.id]: event.target.value,
                    }))
                  }
                  className={blankInputStateClasses(blankState())}
                />
              )}
            </span>
          );
        })}
      </p>

      {!disabled && (
        <div className="mt-4">
          <GermanKeyboard onInsert={insertChar} disabled={disabled} />
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {(status === 'answering' || status === 'submitting') && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allFilled || status === 'submitting'}
            className={PRIMARY_BUTTON}
          >
            {status === 'submitting' ? 'Comprobando…' : 'Comprobar'}
          </button>
        </div>
      )}

      <FeedbackMessage
        status={status}
        onRetry={handleRetry}
        onAdvance={handleAdvance}
        detail={feedbackDetail()}
      />
    </div>
  );
}
