import { useMemo, useState } from 'react';
import { SupportText, TargetText } from '../ui/typography';
import { resolveText, type GlossaryEntry } from '../../lib/types';

interface GlossaryTextProps {
  text: string;
  glossary: GlossaryEntry[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Token {
  text: string;
  entryIndex: number | null;
}

/**
 * Trocea una línea en fragmentos planos y términos de glosario. Los términos
 * vienen del YAML exactamente como aparecen en el texto (incluida puntuación,
 * p. ej. "oder?"), así que la coincidencia es de substring exacto, sin
 * normalizar mayúsculas ni acentos. Se ordenan por longitud descendente antes
 * de construir la alternancia regex para que un término compuesto (p. ej.
 * "Freut mich") se capture entero en vez de partirse por uno más corto
 * contenido en él (p. ej. si "mich" también estuviera en el glosario).
 */
function tokenizeLine(line: string, glossary: GlossaryEntry[]): Token[] {
  if (glossary.length === 0) return [{ text: line, entryIndex: null }];

  const termToIndex = new Map(
    glossary.map((entry, index) => [entry.term, index]),
  );
  const orderedTerms = [...termToIndex.keys()].sort(
    (a, b) => b.length - a.length,
  );
  const pattern = orderedTerms.map(escapeRegExp).join('|');
  const regex = new RegExp(`(${pattern})`, 'g');

  return line
    .split(regex)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      entryIndex: termToIndex.get(part) ?? null,
    }));
}

/**
 * Texto de lectura con glosario tap-to-translate: cada término marcado es un
 * botón que revela su traducción en línea (sin popover — no hay primitivo de
 * posicionamiento flotante en el sistema de diseño y no se justifica añadir
 * uno solo para esto). Varias palabras pueden quedar reveladas a la vez;
 * el estado vive aquí, no en el runner, porque no afecta la corrección de
 * ningún ejercicio.
 */
export function GlossaryText({ text, glossary }: GlossaryTextProps) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());

  const lines = useMemo(
    () => text.split('\n').filter((line) => line.length > 0),
    [text],
  );

  function toggle(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, lineIndex) => {
        const tokens = tokenizeLine(line, glossary);
        return (
          <TargetText key={lineIndex} as="p" className="block leading-relaxed">
            {tokens.map((token, tokenIndex) => {
              if (token.entryIndex === null) {
                return <span key={tokenIndex}>{token.text}</span>;
              }
              const entry = glossary[token.entryIndex];
              const key = `${lineIndex}-${tokenIndex}`;
              const isRevealed = revealed.has(key);
              return (
                <span key={tokenIndex}>
                  <button
                    type="button"
                    aria-expanded={isRevealed}
                    onClick={() => toggle(key)}
                    className="rounded underline decoration-dotted decoration-2 underline-offset-4 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {token.text}
                  </button>
                  {isRevealed && (
                    <SupportText as="span" className="ml-1 text-sm">
                      ({resolveText(entry.translation)})
                    </SupportText>
                  )}
                </span>
              );
            })}
          </TargetText>
        );
      })}
    </div>
  );
}
