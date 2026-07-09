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
}: FeedbackMessageProps) {
  const copy = FEEDBACK_COPY[status] ?? null;

  return (
    <div className="mt-6 flex min-h-11 items-center gap-4">
      {copy && (
        <p
          aria-hidden="true"
          className={`text-sm font-medium ${copy.className}`}
        >
          {copy.text}
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
        {copy?.text}
      </div>
    </div>
  );
}
