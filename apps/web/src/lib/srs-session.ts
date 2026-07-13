import type { SrsCardPublic, SrsSessionResponse } from './types';

export type SrsPhase = 'front' | 'revealed' | 'done';

export interface SrsRunnerState {
  queue: SrsCardPublic[];
  index: number;
  phase: SrsPhase;
  reviewedCount: number;
}

export type SrsRunnerAction = { type: 'reveal' } | { type: 'advance' };

/** Vencidas primero, luego nuevas: mismo orden en que las devuelve el backend. */
export function initialSrsRunnerState(
  session: SrsSessionResponse,
): SrsRunnerState {
  const queue = [...session.due, ...session.new];
  return {
    queue,
    index: 0,
    phase: queue.length === 0 ? 'done' : 'front',
    reviewedCount: 0,
  };
}

export function srsRunnerReducer(
  state: SrsRunnerState,
  action: SrsRunnerAction,
): SrsRunnerState {
  switch (action.type) {
    case 'reveal': {
      if (state.phase !== 'front') return state;
      return { ...state, phase: 'revealed' };
    }
    case 'advance': {
      const nextIndex = state.index + 1;
      const reviewedCount = state.reviewedCount + 1;
      const phase = nextIndex >= state.queue.length ? 'done' : 'front';
      return { ...state, index: nextIndex, phase, reviewedCount };
    }
    default:
      return state;
  }
}
