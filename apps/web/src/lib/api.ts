import type { AttemptResult, ExerciseListItem, PublicExercise } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getLessonExercises(slug: string): Promise<ExerciseListItem[]> {
  return apiFetch(`/lessons/${slug}/exercises`);
}

export function getExercise(id: string): Promise<PublicExercise> {
  return apiFetch(`/exercises/${id}`);
}

type Answer =
  { selectedIndices: number[] } | { values: Record<string, string> };

export function submitAttempt(
  exerciseId: string,
  body: { answer: Answer; latencyMs: number },
): Promise<AttemptResult> {
  return apiFetch(`/exercises/${exerciseId}/attempts`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
