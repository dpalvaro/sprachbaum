import { PRIMARY_BUTTON } from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';
import { resolveText, type LocalizedText } from '../../lib/types';

interface CoverScreenProps {
  title: LocalizedText;
  objectives: LocalizedText[];
  onStart: () => void;
}

export function CoverScreen({ title, objectives, onStart }: CoverScreenProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 text-center shadow-sm sm:p-8">
      <TargetText as="h1" className="block text-3xl">
        {resolveText(title)}
      </TargetText>

      {objectives.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2 text-left">
          {objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 text-brand-600">
                •
              </span>
              <SupportText as="span">{resolveText(objective)}</SupportText>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <button type="button" onClick={onStart} className={PRIMARY_BUTTON}>
          Empezar
        </button>
      </div>
    </div>
  );
}
