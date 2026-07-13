import { expect, test, type Page } from '@playwright/test';

/**
 * Camino feliz de la lección a1-l01-hallo (issue #41, extendido en #37):
 * portada → teoría grammar → ejercicios → teoría vocabulary → ejercicios →
 * lectura (glosario tap-to-translate) → preguntas de comprensión → resumen.
 * Casos borde (fallar, reveal, saltar teoría distinto de "saltar siempre")
 * quedan fuera de este spec a propósito. listening queda fuera del runner
 * por alcance (issue #38, depende de TTS), no por tipo de ejercicio sin
 * corrección.
 *
 * Las respuestas están transcritas de content/de/a1/a1-l01-hallo.yaml. El
 * runner (apps/web/src/lib/lesson-runner.ts) corrige los seis tipos que hoy
 * cubre SUPPORTED_EXERCISE_TYPES (multiple_choice, fill_blank,
 * sentence_order, short_answer, matching), así que el test interactúa con
 * los 10 ejercicios de gramática, los 10 de vocabulario y las 5 preguntas de
 * comprensión de reading: la lección 1 se juega completa salvo listening. Si
 * se edita ese YAML (texto de opciones, orden, respuestas, texto o glosario
 * de la lectura), este test hay que actualizarlo a la vez.
 */

type Answer =
  | { kind: 'multiple_choice'; optionText: string }
  | { kind: 'fill_blank'; value: string }
  // Índices en `payload.fragments` (no el texto) en el orden en que hay que
  // tocarlos: evita ambigüedad si dos fragmentos comparten texto, y coincide
  // con cómo SentenceOrder mantiene los botones del pool en su posición
  // original aunque se deshabiliten al colocarse (ver decisión de diseño en
  // apps/web/src/components/exercises/SentenceOrder.tsx).
  | { kind: 'sentence_order'; tapOrder: number[] }
  | { kind: 'short_answer'; value: string }
  // Por texto, no por posición: payload.rights llega barajado por el
  // servidor en cada respuesta (shuffleMatchingRights), así que la posición
  // no es estable entre cargas — solo el texto lo es.
  | { kind: 'matching'; pairs: { left: string; rightText: string }[] };

const GRAMMAR_ANSWERS: Answer[] = [
  { kind: 'multiple_choice', optionText: 'bin' }, // l01-sein-ex01
  { kind: 'multiple_choice', optionText: 'bist' }, // l01-sein-ex02
  { kind: 'fill_blank', value: 'bin' }, // l01-sein-ex03
  { kind: 'fill_blank', value: 'ist' }, // l01-sein-ex04
  { kind: 'fill_blank', value: 'sind' }, // l01-sein-ex05
  { kind: 'fill_blank', value: 'seid' }, // l01-sein-ex06
  { kind: 'multiple_choice', optionText: 'Sie' }, // l01-sein-ex07
  // fragments: ['Anna', 'bin', 'ich'], correctOrder: [2, 1, 0] → ich bin Anna.
  { kind: 'sentence_order', tapOrder: [2, 1, 0] }, // l01-sein-ex08
  // fragments: ['du', 'müde', 'bist'], correctOrder: [2, 0, 1] → bist du müde.
  { kind: 'sentence_order', tapOrder: [2, 0, 1] }, // l01-sein-ex09
  { kind: 'multiple_choice', optionText: 'segunda' }, // l01-sein-ex10
];

const VOCAB_ANSWERS: Answer[] = [
  {
    kind: 'matching',
    pairs: [
      { left: 'hallo', rightText: 'hola' },
      { left: 'danke', rightText: 'gracias' },
      { left: 'tschüss', rightText: 'adiós' },
      { left: 'bitte', rightText: 'por favor' },
    ],
  }, // l01-voc-ex01
  {
    kind: 'matching',
    pairs: [
      { left: 'guten Morgen', rightText: 'buenos días' },
      { left: 'guten Abend', rightText: 'buenas noches' },
      { left: 'auf Wiedersehen', rightText: 'adiós (formal)' },
    ],
  }, // l01-voc-ex02
  { kind: 'multiple_choice', optionText: 'auf Wiedersehen' }, // l01-voc-ex03
  { kind: 'multiple_choice', optionText: 'Hallo' }, // l01-voc-ex04
  { kind: 'fill_blank', value: 'Bitte' }, // l01-voc-ex05
  { kind: 'multiple_choice', optionText: 'Guten Abend' }, // l01-voc-ex06
  { kind: 'fill_blank', value: 'Morgen' }, // l01-voc-ex07
  { kind: 'multiple_choice', optionText: 'Frau' }, // l01-voc-ex08
  { kind: 'fill_blank', value: 'Name' }, // l01-voc-ex09
  { kind: 'short_answer', value: 'danke' }, // l01-voc-ex10
];

const READING_ANSWERS: Answer[] = [
  { kind: 'multiple_choice', optionText: 'München' }, // l01-read-q01
  { kind: 'multiple_choice', optionText: 'Berlin' }, // l01-read-q02
  { kind: 'multiple_choice', optionText: 'Studentin' }, // l01-read-q03
  { kind: 'multiple_choice', optionText: 'Lehrer' }, // l01-read-q04
  { kind: 'short_answer', value: 'tschüss' }, // l01-read-q05
];

async function answerCorrectly(page: Page, answer: Answer): Promise<void> {
  if (answer.kind === 'multiple_choice') {
    await page
      .getByRole('radio', { name: answer.optionText, exact: true })
      .click();
  } else if (answer.kind === 'fill_blank' || answer.kind === 'short_answer') {
    // Todos los blanks de esta lección tienen un único hueco por ejercicio (y
    // short_answer siempre tiene un único input), así que no hace falta
    // desambiguar por aria-label.
    await page.getByRole('textbox').fill(answer.value);
  } else if (answer.kind === 'sentence_order') {
    // Por posición, no por texto: dos fragmentos con el mismo texto
    // seleccionarían el mismo botón si se buscara por name. El pool mantiene
    // el orden original de `fragments` (los botones no se reordenan ni
    // desaparecen al colocarse, solo se deshabilitan), así que .nth(index)
    // siempre apunta al fragmento correcto.
    const pool = page.getByRole('group', { name: 'Fragmentos disponibles' });
    for (const fragmentIndex of answer.tapOrder) {
      await pool.getByRole('button').nth(fragmentIndex).click();
    }
  } else {
    // Por texto, no por posición (ver el comentario del tipo Answer):
    // payload.rights llega barajado por el servidor, así que cada par se
    // resuelve tocando el left y luego el right por su nombre accesible.
    const leftGroup = page.getByRole('group', { name: 'Palabras en alemán' });
    const rightGroup = page.getByRole('group', { name: 'Traducciones' });
    for (const pair of answer.pairs) {
      await leftGroup
        .getByRole('button', { name: pair.left, exact: true })
        .click();
      await rightGroup
        .getByRole('button', { name: pair.rightText, exact: true })
        .click();
    }
  }

  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('recorre la lección a1-l01-hallo completa respondiendo bien', async ({
  page,
}) => {
  await page.goto('/leccion/a1-l01-hallo');

  await page.getByRole('button', { name: 'Empezar' }).click();

  // Teoría de gramática → saltar directo a ejercicios.
  await page.getByRole('button', { name: 'Saltar a los ejercicios' }).click();
  for (const answer of GRAMMAR_ANSWERS) {
    await answerCorrectly(page, answer);
  }

  // Teoría de vocabulario → saltar directo a ejercicios.
  await page.getByRole('button', { name: 'Saltar a los ejercicios' }).click();
  for (const answer of VOCAB_ANSWERS) {
    await answerCorrectly(page, answer);
  }

  // Lectura: el glosario tap-to-translate revela la traducción en línea al
  // tocar una palabra marcada, sin navegar fuera de la pantalla de lectura.
  await page.getByRole('button', { name: 'aber', exact: true }).click();
  await expect(page.getByText('(pero)')).toBeVisible();

  await page.getByRole('button', { name: 'Saltar a los ejercicios' }).click();
  for (const answer of READING_ANSWERS) {
    await answerCorrectly(page, answer);
  }

  await expect(page.getByText('¡Lección completada!')).toBeVisible();
  const total =
    GRAMMAR_ANSWERS.length + VOCAB_ANSWERS.length + READING_ANSWERS.length;
  await expect(page.getByText(`${total}/${total}`)).toBeVisible();
});
