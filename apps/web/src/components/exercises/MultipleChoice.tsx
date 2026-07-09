'use client';

import { useRef, useState } from 'react';
import {
  FeedbackMessage,
  optionStateClasses,
  PRIMARY_BUTTON,
  type OptionState,
} from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';
import { useExerciseAttempt } from '../../hooks/useExerciseAttempt';
import { resolveText, type PublicExercise } from '../../lib/types';

interface MultipleChoiceProps {
  exercise: Extract<PublicExercise, { type: 'multiple_choice' }>;
  onAdvance?: () => void;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5 shrink-0 text-success"
      aria-hidden="true"
    >
      <path
        d="M4 10.5l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-5 w-5 shrink-0 text-danger"
      aria-hidden="true"
    >
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MultipleChoice({ exercise, onAdvance }: MultipleChoiceProps) {
  const { status, lastResult, error, submit, retryAnswering } =
    useExerciseAttempt(exercise.id);
  const [selected, setSelected] = useState<number | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { prompt, options, skillTag } = exercise.payload;
  const promptText = resolveText(prompt);
  const disabled =
    status === 'submitting' || status === 'correct' || status === 'revealed';

  function optionState(index: number): OptionState {
    if (status === 'revealed') {
      // Este componente solo corrige multiple_choice: revealedSolution
      // siempre es number[] aquí (fill_blank usa Record<blankId, string[]>).
      const correctIndices = lastResult?.revealedSolution as
        number[] | undefined;
      if (correctIndices?.includes(index)) return 'correct';
      if (index === selected) return 'incorrect';
      return 'idle';
    }
    if (status === 'correct' && index === selected) return 'correct';
    if (status === 'retry' && index === selected) return 'incorrect';
    return index === selected ? 'selected' : 'idle';
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      const next = (index + 1) % options.length;
      setSelected(next);
      optionRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = (index - 1 + options.length) % options.length;
      setSelected(prev);
      optionRefs.current[prev]?.focus();
    }
  }

  async function handleSubmit() {
    if (selected === null) return;
    await submit({ selectedIndices: [selected] });
  }

  function handleRetry() {
    setSelected(null);
    retryAnswering();
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
        role="radiogroup"
        aria-label={promptText}
        className="flex flex-col gap-3"
      >
        {options.map((option, index) => {
          const label =
            typeof option === 'string' ? option : resolveText(option);
          const state = optionState(index);
          const isTabbable =
            selected === null ? index === 0 : selected === index;
          return (
            <button
              key={index}
              ref={(el) => {
                optionRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected === index}
              tabIndex={isTabbable ? 0 : -1}
              disabled={disabled}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={optionStateClasses(state)}
            >
              <TargetText className="text-lg">{label}</TargetText>
              {state === 'correct' && <CheckIcon />}
              {state === 'incorrect' && <CrossIcon />}
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
            disabled={selected === null || status === 'submitting'}
            className={PRIMARY_BUTTON}
          >
            {status === 'submitting' ? 'Comprobando…' : 'Comprobar'}
          </button>
        </div>
      )}

      <FeedbackMessage
        status={status}
        onRetry={handleRetry}
        onAdvance={onAdvance}
      />
    </div>
  );
}
