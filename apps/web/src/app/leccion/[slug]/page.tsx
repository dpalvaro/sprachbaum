import { notFound } from 'next/navigation';
import { getExercise, getLessonExercises } from '../../../lib/api';
import { LessonExerciseDemo } from '../../../components/exercises/LessonExerciseDemo';

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type = 'multiple_choice' } = await searchParams;
  const exercises = await getLessonExercises(slug).catch(() => null);
  if (!exercises) {
    notFound();
  }

  const firstOfType = exercises.find((e) => e.type === type);
  if (!firstOfType) {
    notFound();
  }

  const exercise = await getExercise(firstOfType.id);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-canvas px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-medium text-ink-muted">
          Sprachbaum · A1 · {slug}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{type}</h1>
      </div>
      <LessonExerciseDemo exercise={exercise} />
    </main>
  );
}
