import { PRIMARY_BUTTON } from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';
import { resolveText, type PublicSection } from '../../lib/types';

interface GrammarTheoryProps {
  section: Extract<PublicSection, { type: 'grammar' }>;
  onSkip: () => void;
}

export function GrammarTheory({ section, onSkip }: GrammarTheoryProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-sm sm:p-8">
      {section.title && (
        <SupportText as="h2" className="mb-4 block text-lg font-semibold">
          {resolveText(section.title)}
        </SupportText>
      )}

      <SupportText as="p" className="mb-6 block leading-relaxed">
        {resolveText(section.explanation)}
      </SupportText>

      <ul className="flex flex-col gap-3">
        {section.examples.map((example, index) => (
          <li
            key={index}
            className="rounded-xl border border-surface-border bg-canvas px-4 py-3"
          >
            <TargetText as="p" className="block text-lg">
              {example.de}
            </TargetText>
            {example.es && (
              <SupportText as="p" className="mt-1 block text-sm">
                {example.es}
              </SupportText>
            )}
            {example.note && (
              <SupportText as="p" className="mt-1 block text-xs italic">
                {resolveText(example.note)}
              </SupportText>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <button type="button" onClick={onSkip} className={PRIMARY_BUTTON}>
          Saltar a los ejercicios
        </button>
      </div>
    </div>
  );
}
