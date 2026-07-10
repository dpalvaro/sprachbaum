import { notFound } from 'next/navigation';
import { getLesson } from '../../../lib/api';
import { LessonRunner } from '../../../components/lesson/LessonRunner';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = await getLesson(slug).catch(() => null);
  if (!lesson) {
    notFound();
  }

  return <LessonRunner lesson={lesson} />;
}
