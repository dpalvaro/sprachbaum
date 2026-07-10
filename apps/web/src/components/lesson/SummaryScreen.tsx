import { SupportText, TargetText } from '../ui/typography';
import type { RunnerSummary } from '../../lib/lesson-runner';

export function SummaryScreen({ summary }: { summary: RunnerSummary }) {
  const { correct, total, bySkill } = summary;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <SupportText as="p" className="block text-sm">
        ¡Lección completada!
      </SupportText>
      <TargetText as="p" className="mt-2 block text-4xl">
        {correct}/{total}
      </TargetText>
      <SupportText as="p" className="mt-1 block text-sm">
        ejercicios correctos
      </SupportText>

      {bySkill.length > 0 && (
        <ul className="mt-8 flex flex-col gap-2 text-left">
          {bySkill.map((skill) => (
            <li
              key={skill.skillTag}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-canvas px-4 py-2"
            >
              <SupportText as="span" className="text-sm">
                {skill.skillTag}
              </SupportText>
              <span className="text-sm font-semibold text-ink">
                {skill.correct}/{skill.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
