import type { PublicSection } from '../../lib/types';
import { GrammarTheory } from './GrammarTheory';
import { VocabularyPresentation } from './VocabularyPresentation';

interface TheoryScreenProps {
  section: PublicSection;
  onSkip: () => void;
}

/**
 * Alcance de esta versión del runner (issue #39): solo grammar/vocabulary
 * tienen teoría implementada. reading/listening nunca llegan aquí hoy
 * (buildRunnableSections ya los excluye), pero el `default` documenta que
 * #37/#38 solo necesitan añadir un case, no tocar el resto del runner.
 */
export function TheoryScreen({ section, onSkip }: TheoryScreenProps) {
  switch (section.type) {
    case 'grammar':
      return <GrammarTheory section={section} onSkip={onSkip} />;
    case 'vocabulary':
      return <VocabularyPresentation section={section} onSkip={onSkip} />;
    default:
      return null;
  }
}
