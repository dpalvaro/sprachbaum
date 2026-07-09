// Un usuario sin teclado alemán simplifica ä/ö/ü/ß de dos formas distintas en
// la práctica: la transliteración oficial (ü→ue, ö→oe, ä→ae, ß→ss, p. ej.
// "schön"→"schoen") y quitar solo la diéresis sin añadir letra (ü→u, p. ej.
// "Tschüss"→"Tschuss"). Ambas son habituales, así que una respuesta se acepta
// si CUALQUIERA de las dos formas coincide con CUALQUIERA de las del texto
// aceptado — ver `normalizedVariants`.
const DIGRAPH_MAP: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ẞ: 'Ss',
};

const STRIPPED_MAP: Record<string, string> = {
  ä: 'a',
  ö: 'o',
  ü: 'u',
  ß: 'ss',
  Ä: 'A',
  Ö: 'O',
  Ü: 'U',
  ẞ: 'Ss',
};

function applyMap(value: string, map: Record<string, string>): string {
  return value.replace(/[äöüßÄÖÜẞ]/g, (char) => map[char] ?? char);
}

export interface NormalizeAnswerOptions {
  caseSensitive?: boolean;
}

function surfaceNormalize(raw: string, caseSensitive: boolean | undefined) {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

/**
 * Las formas normalizadas de `raw` bajo ambas convenciones de plegado de
 * diéresis/ß, tras recortar espacios y aplicar mayúsculas/minúsculas según
 * `caseSensitive`.
 */
function normalizedVariants(
  raw: string,
  { caseSensitive }: NormalizeAnswerOptions,
): Set<string> {
  const surface = surfaceNormalize(raw, caseSensitive);
  return new Set([
    applyMap(surface, DIGRAPH_MAP),
    applyMap(surface, STRIPPED_MAP),
  ]);
}

/** Forma normalizada "canónica" (convención de dígrafo) — usada solo para mostrar, no para comparar. */
export function normalizeAnswer(
  raw: string,
  options: NormalizeAnswerOptions = {},
): string {
  const surface = surfaceNormalize(raw, options.caseSensitive);
  return applyMap(surface, DIGRAPH_MAP);
}

/**
 * True si `raw` coincide con alguna entrada de `accepted`, tolerando espacios,
 * mayúsculas (salvo `caseSensitive`) y cualquiera de las dos convenciones de
 * plegado de ä/ö/ü/ß.
 */
export function matchesAccepted(
  raw: string,
  accepted: string[],
  options: NormalizeAnswerOptions = {},
): boolean {
  const rawVariants = normalizedVariants(raw, options);
  return accepted.some((candidate) => {
    const candidateVariants = normalizedVariants(candidate, options);
    for (const variant of rawVariants) {
      if (candidateVariants.has(variant)) return true;
    }
    return false;
  });
}

/**
 * Forma "canónica" a mostrar en el feedback cuando la respuesta es correcta
 * pero difiere ortográficamente de la entrada aceptada (p. ej. el usuario
 * escribió "Tschuss" y la respuesta canónica es "Tschüss"). Se prioriza una
 * entrada de `accepted` que contenga ä/ö/ü/ß sobre una puramente ASCII, y
 * dentro de esas, la primera en orden de autoría.
 *
 * Devuelve `undefined` cuando la respuesta del usuario ya coincide
 * textualmente (solo difiriendo en mayúsculas/espacios), porque en ese caso no
 * hay nada de ortografía especial que enseñar.
 */
export function canonicalFormIfDifferent(
  raw: string,
  accepted: string[],
  options: NormalizeAnswerOptions = {},
): string | undefined {
  const surface = surfaceNormalize(raw, options.caseSensitive);
  // `accepted` viene de content-schema con `.min(1)`, siempre tiene al menos
  // una entrada; el fallback vacío solo satisface a TypeScript.
  const canonical =
    accepted.find((candidate) => /[äöüßÄÖÜẞ]/.test(candidate)) ??
    accepted[0] ??
    '';
  const canonicalSurface = surfaceNormalize(canonical, options.caseSensitive);

  if (surface === canonicalSurface) {
    return undefined;
  }
  return canonical;
}
