import type { PublicSection } from '../../lib/types';
import { GrammarTheory } from './GrammarTheory';
import { ReadingPresentation } from './ReadingPresentation';
import { VocabularyPresentation } from './VocabularyPresentation';

interface TheoryScreenProps {
  section: PublicSection;
  onSkip: () => void;
}

/**
 * listening todavía no tiene teoría implementada (issue #38); nunca llega
 * aquí hoy porque buildRunnableSections lo excluye, pero el `default`
 * documenta que solo necesita añadir un case, no tocar el resto del runner.
 */
export function TheoryScreen({ section, onSkip }: TheoryScreenProps) {
  switch (section.type) {
    case 'grammar':
      return <GrammarTheory section={section} onSkip={onSkip} />;
    case 'vocabulary':
      return <VocabularyPresentation section={section} onSkip={onSkip} />;
    case 'reading':
      return <ReadingPresentation section={section} onSkip={onSkip} />;
    default:
      return null;
  }
}
