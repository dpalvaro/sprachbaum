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

interface MatchingProps {
  exercise: Extract<PublicExercise, { type: 'matching' }>;
  onAdvance?: (outcome: ExerciseOutcome) => void;
}

/**
 * Tap-to-place, no drag & drop: toca un elemento de la izquierda y luego uno
 * de la derecha para formar un par; ambos quedan deshabilitados. El orden de
 * `payload.rights` ya llega barajado por el servidor en cada respuesta (ver
 * shuffleMatchingRights) — este componente solo lo muestra, no lo reordena.
 * La corrección compara por texto, no por posición, así que `matches` se
 * envía como left → texto resuelto del right elegido; el color de un right
 * en pantalla se deriva siempre del left con el que está emparejado, nunca
 * de su posición.
 */
export function Matching({ exercise, onAdvance }: MatchingProps) {
  const { status, lastResult, error, submit, retryAnswering } =
    useExerciseAttempt(exercise.id);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  const { prompt, lefts, rights, skillTag } = exercise.payload;
  const promptText = resolveText(prompt);
  const disabled =
    status === 'submitting' || status === 'correct' || status === 'revealed';
  const allMatched = Object.keys(matches).length === lefts.length;
  const revealedSolution = lastResult?.revealedSolution as
    Record<string, string> | undefined;
  const matchedRightTexts = new Set(Object.values(matches));

  function leftForRightText(rightText: string): string | undefined {
    return Object.entries(matches).find(([, r]) => r === rightText)?.[0];
  }

  function leftState(left: string): OptionState {
    const isMatched = left in matches;
    if (status === 'correct') return isMatched ? 'correct' : 'idle';
    if (status === 'retry') return isMatched ? 'incorrect' : 'idle';
    if (status === 'revealed' && revealedSolution) {
      if (!isMatched) return 'idle';
      return matches[left] === revealedSolution[left] ? 'correct' : 'incorrect';
    }
    if (isMatched || selectedLeft === left) return 'selected';
    return 'idle';
  }

  function rightState(rightText: string): OptionState {
    const left = leftForRightText(rightText);
    return left ? leftState(left) : 'idle';
  }

  function handleLeftTap(left: string) {
    if (disabled || left in matches) return;
    setSelectedLeft((prev) => (prev === left ? null : left));
  }

  function handleRightTap(rightText: string) {
    if (disabled || matchedRightTexts.has(rightText) || !selectedLeft) return;
    const left = selectedLeft;
    setMatches((prev) => ({ ...prev, [left]: rightText }));
    setSelectedLeft(null);
  }

  async function handleSubmit() {
    if (!allMatched) return;
    await submit({ matches });
  }

  function handleRetry() {
    setMatches({});
    setSelectedLeft(null);
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

      <div className="grid grid-cols-2 gap-3">
        <div
          role="group"
          aria-label="Palabras en alemán"
          className="flex flex-col gap-2"
        >
          {lefts.map((left) => (
            <button
              key={left}
              type="button"
              disabled={disabled || left in matches}
              aria-pressed={selectedLeft === left}
              onClick={() => handleLeftTap(left)}
              className={optionStateClasses(leftState(left))}
            >
              <TargetText className="text-lg">{left}</TargetText>
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Traducciones"
          className="flex flex-col gap-2"
        >
          {rights.map((right, index) => {
            const rightText = resolveText(right);
            return (
              <button
                key={index}
                type="button"
                disabled={
                  disabled || matchedRightTexts.has(rightText) || !selectedLeft
                }
                onClick={() => handleRightTap(rightText)}
                className={optionStateClasses(rightState(rightText))}
              >
                <TargetText className="text-lg">{rightText}</TargetText>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {(status === 'answering' || status === 'submitting') && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allMatched || status === 'submitting'}
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
      />
    </div>
  );
}
