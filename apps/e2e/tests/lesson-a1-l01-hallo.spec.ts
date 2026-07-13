import { expect, test, type Page } from '@playwright/test';

/**
 * Camino feliz de la lección a1-l01-hallo (issue #41): portada → teoría
 * grammar → ejercicios (todos correctos) → teoría vocabulary → ejercicios
 * (todos correctos) → resumen. Casos borde (fallar, reveal, saltar teoría
 * distinto de "saltar siempre") quedan fuera de este spec a propósito.
 *
 * Las respuestas están transcritas de content/de/a1/a1-l01-hallo.yaml. El
 * runner (apps/web/src/lib/lesson-runner.ts) corrige multiple_choice,
 * fill_blank y sentence_order hoy, así que matching/short_answer quedan
 * fuera del recorrido — de los 10+10 ejercicios del YAML, el test interactúa
 * con los 10 de gramática y los 7 de vocabulario que sí son
 * SUPPORTED_EXERCISE_TYPES. Si se edita ese YAML (texto de opciones, orden,
 * respuestas), este test hay que actualizarlo a la vez.
 */

type Answer =
  | { kind: 'multiple_choice'; optionText: string }
  | { kind: 'fill_blank'; value: string }
  // Índices en `payload.fragments` (no el texto) en el orden en que hay que
  // tocarlos: evita ambigüedad si dos fragmentos comparten texto, y coincide
  // con cómo SentenceOrder mantiene los botones del pool en su posición
  // original aunque se deshabiliten al colocarse (ver decisión de diseño en
  // apps/web/src/components/exercises/SentenceOrder.tsx).
  | { kind: 'sentence_order'; tapOrder: number[] };

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
  { kind: 'multiple_choice', optionText: 'auf Wiedersehen' }, // l01-voc-ex03
  { kind: 'multiple_choice', optionText: 'Hallo' }, // l01-voc-ex04
  { kind: 'fill_blank', value: 'Bitte' }, // l01-voc-ex05
  { kind: 'multiple_choice', optionText: 'Guten Abend' }, // l01-voc-ex06
  { kind: 'fill_blank', value: 'Morgen' }, // l01-voc-ex07
  { kind: 'multiple_choice', optionText: 'Frau' }, // l01-voc-ex08
  { kind: 'fill_blank', value: 'Name' }, // l01-voc-ex09
];

async function answerCorrectly(page: Page, answer: Answer): Promise<void> {
  if (answer.kind === 'multiple_choice') {
    await page
      .getByRole('radio', { name: answer.optionText, exact: true })
      .click();
  } else if (answer.kind === 'fill_blank') {
    // Todos los blanks de esta lección tienen un único hueco por ejercicio,
    // así que no hace falta desambiguar por aria-label ("Hueco 1").
    await page.getByRole('textbox').fill(answer.value);
  } else {
    // Por posición, no por texto: dos fragmentos con el mismo texto
    // seleccionarían el mismo botón si se buscara por name. El pool mantiene
    // el orden original de `fragments` (los botones no se reordenan ni
    // desaparecen al colocarse, solo se deshabilitan), así que .nth(index)
    // siempre apunta al fragmento correcto.
    const pool = page.getByRole('group', { name: 'Fragmentos disponibles' });
    for (const fragmentIndex of answer.tapOrder) {
      await pool.getByRole('button').nth(fragmentIndex).click();
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

  await expect(page.getByText('¡Lección completada!')).toBeVisible();
  const total = GRAMMAR_ANSWERS.length + VOCAB_ANSWERS.length;
  await expect(page.getByText(`${total}/${total}`)).toBeVisible();
});
