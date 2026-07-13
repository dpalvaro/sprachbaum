'use client';

import { useRef, useState } from 'react';
import {
  blankInputStateClasses,
  FeedbackMessage,
  PRIMARY_BUTTON,
  type BlankState,
} from '../ui/exercise-feedback';
import { GermanKeyboard } from '../ui/GermanKeyboard';
import { SupportText } from '../ui/typography';
import { useExerciseAttempt } from '../../hooks/useExerciseAttempt';
import {
  resolveText,
  type ExerciseOutcome,
  type PublicExercise,
} from '../../lib/types';

interface ShortAnswerProps {
  exercise: Extract<PublicExercise, { type: 'short_answer' }>;
  onAdvance?: (outcome: ExerciseOutcome) => void;
}

/**
 * fill_blank sin frase alrededor: un único input libre, misma normalización
 * server-side (matchesAccepted) y mismo teclado de caracteres especiales.
 */
export function ShortAnswer({ exercise, onAdvance }: ShortAnswerProps) {
  const { status, lastResult, error, submit, retryAnswering } =
    useExerciseAttempt(exercise.id);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { prompt, skillTag } = exercise.payload;
  const promptText = resolveText(prompt);
  const disabled =
    status === 'submitting' || status === 'correct' || status === 'revealed';
  const revealedSolution = lastResult?.revealedSolution as string[] | undefined;

  function inputState(): BlankState {
    if (status === 'correct') return 'correct';
    if (status === 'retry' || status === 'revealed') return 'incorrect';
    return 'idle';
  }

  function feedbackDetail(): string | undefined {
    if (status === 'correct' && lastResult?.canonicalAnswers?.value) {
      return `Se escribe: ${lastResult.canonicalAnswers.value}`;
    }
    if (status === 'revealed' && revealedSolution?.[0]) {
      return `Respuesta correcta: ${revealedSolution[0]}`;
    }
    return undefined;
  }

  function insertChar(char: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + char + value.slice(end);
    setValue(next);
    const cursor = start + char.length;
    requestAnimationFrame(() => {
      input?.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSubmit() {
    if (value.trim().length === 0) return;
    await submit({ value });
  }

  function handleRetry() {
    setValue('');
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

      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Tu respuesta"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        className={blankInputStateClasses(inputState())}
      />

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
            disabled={value.trim().length === 0 || status === 'submitting'}
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
