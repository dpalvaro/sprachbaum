'use client';

import { useState } from 'react';
import {
  FeedbackMessage,
  optionStateClasses,
  PRIMARY_BUTTON,
  type OptionState,
} from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';
import { useExerciseAttempt } from '../../hooks/useExerciseAttempt';
import {
  resolveText,
  type ExerciseOutcome,
  type PublicExercise,
} from '../../lib/types';

interface SentenceOrderProps {
  exercise: Extract<PublicExercise, { type: 'sentence_order' }>;
  onAdvance?: (outcome: ExerciseOutcome) => void;
}

/**
 * Tap-to-place, no drag & drop: los fragmentos se referencian siempre por su
 * índice original en `payload.fragments`, nunca por su texto — dos
 * fragmentos con el mismo texto (p. ej. "ich" repetido) siguen siendo
 * botones distintos e independientes.
 */
export function SentenceOrder({ exercise, onAdvance }: SentenceOrderProps) {
  const { status, lastResult, error, submit, retryAnswering } =
    useExerciseAttempt(exercise.id);
  const [order, setOrder] = useState<number[]>([]);

  const { prompt, fragments, skillTag } = exercise.payload;
  const promptText = resolveText(prompt);
  const disabled =
    status === 'submitting' || status === 'correct' || status === 'revealed';
  const allPlaced = order.length === fragments.length;
  const revealedOrder = lastResult?.revealedSolution as number[] | undefined;

  function placedState(position: number): OptionState {
    if (status === 'correct') return 'correct';
    if (status === 'retry') return 'incorrect';
    if (status === 'revealed' && revealedOrder) {
      return order[position] === revealedOrder[position]
        ? 'correct'
        : 'incorrect';
    }
    return 'selected';
  }

  function handlePlace(fragmentIndex: number) {
    if (disabled || order.includes(fragmentIndex)) return;
    setOrder((prev) => [...prev, fragmentIndex]);
  }

  // Quita ese fragmento concreto (no solo el último) y recoloca los demás.
  function handleRemove(position: number) {
    if (disabled) return;
    setOrder((prev) => prev.filter((_, i) => i !== position));
  }

  async function handleSubmit() {
    if (!allPlaced) return;
    await submit({ order });
  }

  function handleRetry() {
    setOrder([]);
    retryAnswering();
  }

  function handleAdvance() {
    if (!lastResult) return;
    onAdvance?.({
      correct: lastResult.correct,
      attemptNumber: lastResult.attemptNumber,
    });
  }

  function feedbackDetail(): string | undefined {
    if (status === 'revealed' && revealedOrder) {
      const sentence = revealedOrder.map((i) => fragments[i]).join(' ');
      return `Respuesta correcta: ${sentence}`;
    }
    return undefined;
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

      <div
        role="group"
        aria-label="Frase que estás construyendo"
        className="mb-4 flex min-h-14 flex-wrap items-center gap-2 rounded-xl border border-dashed border-surface-border bg-canvas p-3"
      >
        {order.length === 0 && (
          <p className="text-sm text-ink-muted">
            Toca los fragmentos en el orden correcto.
          </p>
        )}
        {order.map((fragmentIndex, position) => (
          <button
            key={position}
            type="button"
            disabled={disabled}
            onClick={() => handleRemove(position)}
            aria-label={`Quitar "${fragments[fragmentIndex]}", posición ${position + 1} de ${order.length}`}
            className={optionStateClasses(placedState(position))}
          >
            <TargetText className="text-lg">
              {fragments[fragmentIndex]}
            </TargetText>
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Fragmentos disponibles"
        className="flex flex-wrap gap-2"
      >
        {fragments.map((fragment, index) => {
          const isPlaced = order.includes(index);
          return (
            <button
              key={index}
              type="button"
              disabled={disabled || isPlaced}
              onClick={() => handlePlace(index)}
              className={optionStateClasses(isPlaced ? 'selected' : 'idle')}
            >
              <TargetText className="text-lg">{fragment}</TargetText>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {(status === 'answering' || status === 'submitting') && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allPlaced || status === 'submitting'}
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
