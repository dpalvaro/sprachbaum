import { PRIMARY_BUTTON } from '../ui/exercise-feedback';
import { SupportText } from '../ui/typography';
import { resolveText, type PublicSection } from '../../lib/types';
import { GlossaryText } from './GlossaryText';

interface ReadingPresentationProps {
  section: Extract<PublicSection, { type: 'reading' }>;
  onSkip: () => void;
}

export function ReadingPresentation({
  section,
  onSkip,
}: ReadingPresentationProps) {
  return (
    <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface p-6 shadow-sm sm:p-8">
      {section.title && (
        <SupportText as="h2" className="mb-6 block text-lg font-semibold">
          {resolveText(section.title)}
        </SupportText>
      )}

      <GlossaryText text={section.text} glossary={section.glossary} />

      <div className="mt-6">
        <button type="button" onClick={onSkip} className={PRIMARY_BUTTON}>
          Saltar a los ejercicios
        </button>
      </div>
    </div>
  );
}
