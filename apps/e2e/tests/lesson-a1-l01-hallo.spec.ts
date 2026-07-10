import { expect, test, type Page } from '@playwright/test';

/**
 * Camino feliz de la lección a1-l01-hallo (issue #41): portada → teoría
 * grammar → ejercicios (todos correctos) → teoría vocabulary → ejercicios
 * (todos correctos) → resumen. Casos borde (fallar, reveal, saltar teoría
 * distinto de "saltar siempre") quedan fuera de este spec a propósito.
 *
 * Las respuestas están transcritas de content/de/a1/a1-l01-hallo.yaml. El
 * runner (apps/web/src/lib/lesson-runner.ts) solo corrige multiple_choice y
 * fill_blank hoy, así que sentence_order/matching/short_answer quedan fuera
 * del recorrido — de los 10+10 ejercicios del YAML, el test interactúa con
 * los 8 de gramática y los 7 de vocabulario que sí son SUPPORTED_EXERCISE_TYPES.
 * Si se edita ese YAML (texto de opciones, orden, respuestas), este test hay
 * que actualizarlo a la vez.
 */

type Answer =
  | { kind: 'multiple_choice'; optionText: string }
  | { kind: 'fill_blank'; value: string };

const GRAMMAR_ANSWERS: Answer[] = [
  { kind: 'multiple_choice', optionText: 'bin' }, // l01-sein-ex01
  { kind: 'multiple_choice', optionText: 'bist' }, // l01-sein-ex02
  { kind: 'fill_blank', value: 'bin' }, // l01-sein-ex03
  { kind: 'fill_blank', value: 'ist' }, // l01-sein-ex04
  { kind: 'fill_blank', value: 'sind' }, // l01-sein-ex05
  { kind: 'fill_blank', value: 'seid' }, // l01-sein-ex06
  { kind: 'multiple_choice', optionText: 'Sie' }, // l01-sein-ex07
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
  } else {
    // Todos los blanks de esta lección tienen un único hueco por ejercicio,
    // así que no hace falta desambiguar por aria-label ("Hueco 1").
    await page.getByRole('textbox').fill(answer.value);
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
