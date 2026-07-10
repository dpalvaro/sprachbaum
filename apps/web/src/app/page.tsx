import Link from 'next/link';
import { PRIMARY_BUTTON } from '../components/ui/exercise-feedback';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <h1 className="text-3xl font-bold text-ink">Sprachbaum</h1>
      <p className="max-w-md text-ink-muted">
        Runner de lección (E4): teoría y ejercicios de grammar/vocabulary contra
        la lección 1 real.
      </p>
      <Link href="/leccion/a1-l01-hallo" className={PRIMARY_BUTTON}>
        Empezar la lección
      </Link>
    </main>
  );
}
