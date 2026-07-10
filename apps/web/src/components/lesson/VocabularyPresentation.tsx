import { PRIMARY_BUTTON } from '../ui/exercise-feedback';
import { SupportText, TargetText } from '../ui/typography';
import { resolveText, type PublicSection } from '../../lib/types';

interface VocabularyPresentationProps {
  section: Extract<PublicSection, { type: 'vocabulary' }>;
  onSkip: () => void;
}

export function VocabularyPresentation({
  section,
  onSkip,
}: VocabularyPresentationProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-sm sm:p-8">
      <SupportText as="h2" className="mb-6 block text-lg font-semibold">
        {resolveText(section.topic)}
      </SupportText>

      <ul className="flex flex-col gap-3">
        {section.items.map((item) => (
          <li
            key={item.slug}
            className="rounded-xl border border-surface-border bg-canvas px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <TargetText as="p" className="text-lg">
                {item.lemma}
              </TargetText>
              <SupportText as="p" className="shrink-0 text-sm">
                {resolveText(item.translation)}
              </SupportText>
            </div>
            {item.example && (
              <div className="mt-2">
                <TargetText as="p" className="block text-sm">
                  {item.example}
                </TargetText>
                {item.exampleTranslation && (
                  <SupportText as="p" className="mt-0.5 block text-xs">
                    {resolveText(item.exampleTranslation)}
                  </SupportText>
                )}
              </div>
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
