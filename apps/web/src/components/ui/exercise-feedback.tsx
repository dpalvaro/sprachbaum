import type { ReactNode } from 'react';

/**
 * Estados y estilos de intento compartidos por los 6 tipos de ejercicio y el
 * futuro runner (issue 39). `AttemptStatus` es la fuente única de verdad —
 * `useExerciseAttempt` y cualquier componente de ejercicio la importan de
 * aquí, nunca la redeclaran.
 */
export type AttemptStatus =
  'answering' | 'submitting' | 'correct' | 'retry' | 'revealed';

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect';

const OPTION_BASE =
  'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed';

const OPTION_STATE_CLASSES: Record<OptionState, string> = {
  idle: 'border-surface-border bg-canvas hover:border-brand-400 hover:bg-brand-50',
  selected: 'border-brand-500 bg-brand-50',
  correct: 'border-success bg-success-bg',
  incorrect: 'border-danger bg-danger-bg',
};

/** Clases de una opción seleccionable (radio, ficha de matching, fragmento...) para un estado dado. */
export function optionStateClasses(state: OptionState): string {
  return `${OPTION_BASE} ${OPTION_STATE_CLASSES[state]}`;
}

export type BlankState = 'idle' | 'correct' | 'incorrect';

const BLANK_INPUT_BASE =
  'mx-1 w-28 rounded-lg border bg-canvas px-2 py-1 text-center text-lg font-semibold text-ink transition-colors duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-70';

// Mismos tokens de color que OPTION_STATE_CLASSES (border-success/danger,
// bg-success-bg/danger-bg) para que fill_blank quede visualmente coherente
// con multiple_choice, aunque el input no es un botón de opción.
const BLANK_STATE_CLASSES: Record<BlankState, string> = {
  idle: 'border-surface-border hover:border-brand-400',
  correct: 'border-success bg-success-bg',
  incorrect: 'border-danger bg-danger-bg',
};

/** Clases de un input de hueco (fill_blank, dictation...) para un estado dado. */
export function blankInputStateClasses(state: BlankState): string {
  return `${BLANK_INPUT_BASE} ${BLANK_STATE_CLASSES[state]}`;
}

export const PRIMARY_BUTTON =
  'rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40';

export const SECONDARY_BUTTON =
  'rounded-xl border border-surface-border px-5 py-2.5 font-semibold text-ink transition-colors duration-200 hover:bg-brand-50';

const FEEDBACK_COPY: Partial<
  Record<AttemptStatus, { text: string; className: string }>
> = {
  correct: { text: '¡Correcto!', className: 'text-success' },
  retry: {
    text: 'No es correcto. Inténtalo de nuevo.',
    className: 'text-caution',
  },
  revealed: {
    text: 'No es correcto. La respuesta correcta está marcada en verde.',
    className: 'text-danger',
  },
};

interface FeedbackMessageProps {
  status: AttemptStatus;
  onRetry?: () => void;
  onAdvance?: () => void;
  /**
   * Contenido opcional tras el copy estático (p. ej. la ortografía canónica
   * en fill_blank: "Se escribe: Tschüss"). multiple_choice nunca lo pasa, así
   * que su comportamiento no cambia; dictation (issue 36) lo reutilizará para
   * el mismo propósito de "feedback con detalle extra".
   */
  detail?: ReactNode;
}

/**
 * Mensaje + acción tras un intento (reintentar / continuar), con anuncio
 * accesible. Es el bloque que más se repetiría entre los 6 tipos si cada uno
 * lo reimplementara, así que vive aquí una sola vez.
 */
export function FeedbackMessage({
  status,
  onRetry,
  onAdvance,
  detail,
}: FeedbackMessageProps) {
  const copy = FEEDBACK_COPY[status] ?? null;

  return (
    <div className="mt-6 flex min-h-11 flex-wrap items-center gap-4">
      {copy && (
        <p
          aria-hidden="true"
          className={`text-sm font-medium ${copy.className}`}
        >
          {copy.text}
        </p>
      )}
      {detail && (
        <p aria-hidden="true" className="text-sm text-ink-muted">
          {detail}
        </p>
      )}
      {status === 'retry' && onRetry && (
        <button type="button" onClick={onRetry} className={SECONDARY_BUTTON}>
          Reintentar
        </button>
      )}
      {(status === 'revealed' || status === 'correct') && onAdvance && (
        <button type="button" onClick={onAdvance} className={SECONDARY_BUTTON}>
          Continuar
        </button>
      )}
      <div aria-live="polite" className="sr-only">
        {copy?.text} {typeof detail === 'string' ? detail : ''}
      </div>
    </div>
  );
}
