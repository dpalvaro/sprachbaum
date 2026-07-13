'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { submitReview } from '../../lib/api';
import { initialSrsRunnerState, srsRunnerReducer } from '../../lib/srs-session';
import {
  resolveText,
  type SrsRating,
  type SrsSessionResponse,
} from '../../lib/types';
import { PRIMARY_BUTTON } from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';

const RATING_LABELS: Record<SrsRating, string> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil',
};

const RATING_BUTTON_BASE =
  'flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-200 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

const RATING_BUTTON_CLASSES: Record<SrsRating, string> = {
  again: `${RATING_BUTTON_BASE} border-danger bg-danger-bg text-danger`,
  hard: `${RATING_BUTTON_BASE} border-caution bg-caution-bg text-caution`,
  good: `${RATING_BUTTON_BASE} border-success bg-success-bg text-success`,
  easy: `${RATING_BUTTON_BASE} border-brand-500 bg-brand-50 text-brand-700`,
};

const RATING_ORDER: SrsRating[] = ['again', 'hard', 'good', 'easy'];

/**
 * Flashcard clásica: ver alemán → revelar traducción/ejemplo → autocalificar
 * con los 4 botones FSRS. No persiste nada en el cliente — cada calificación
 * se manda de inmediato a POST /srs/review, que aplica la transición ts-fsrs
 * en el servidor y emite el LearningEvent; aquí solo se avanza la cola local.
 */
export function SrsSessionRunner({ session }: { session: SrsSessionResponse }) {
  const [state, dispatch] = useReducer(
    srsRunnerReducer,
    session,
    initialSrsRunnerState,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownAt = useRef(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    setError(null);
  }, [state.index]);

  const current = state.queue[state.index];

  async function handleRate(rating: SrsRating) {
    if (!current) return;
    setSubmitting(true);
    setError(null);
    try {
      const latencyMs = Date.now() - shownAt.current;
      await submitReview({ cardId: current.id, rating, latencyMs });
      dispatch({ type: 'advance' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.phase === 'done' || !current) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-sm sm:p-8">
        <SupportText as="p" className="block text-sm">
          {state.reviewedCount > 0
            ? '¡Repaso completado!'
            : 'No hay tarjetas pendientes hoy.'}
        </SupportText>
        {state.reviewedCount > 0 && (
          <TargetText as="p" className="mt-2 block text-4xl">
            {state.reviewedCount}
          </TargetText>
        )}
      </div>
    );
  }

  const { vocabItem } = current;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <SupportText as="p" className="mb-6 block text-sm">
        Tarjeta {state.index + 1} de {state.queue.length}
      </SupportText>

      <TargetText as="p" className="block text-4xl">
        {vocabItem.lemma}
      </TargetText>

      {state.phase === 'front' && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => dispatch({ type: 'reveal' })}
            className={PRIMARY_BUTTON}
          >
            Mostrar respuesta
          </button>
        </div>
      )}

      {state.phase === 'revealed' && (
        <>
          <SupportText as="p" className="mt-3 block text-lg">
            {resolveText(vocabItem.translation)}
          </SupportText>
          {vocabItem.example && (
            <div className="mt-4">
              <TargetText as="p" className="block text-base">
                {vocabItem.example}
              </TargetText>
              {vocabItem.exampleTranslation && (
                <SupportText as="p" className="mt-1 block text-sm">
                  {resolveText(vocabItem.exampleTranslation)}
                </SupportText>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-8 flex gap-2">
            {RATING_ORDER.map((rating) => (
              <button
                key={rating}
                type="button"
                disabled={submitting}
                onClick={() => handleRate(rating)}
                className={RATING_BUTTON_CLASSES[rating]}
              >
                {RATING_LABELS[rating]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
