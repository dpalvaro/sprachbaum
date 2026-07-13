import { SrsSessionRunner } from '../../components/srs/SrsSessionRunner';
import { getSrsSession } from '../../lib/api';

export default async function RepasoPage() {
  const session = await getSrsSession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-canvas px-6 py-16">
      <SrsSessionRunner session={session} />
    </main>
  );
}
