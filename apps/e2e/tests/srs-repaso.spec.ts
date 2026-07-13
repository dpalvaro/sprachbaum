import { expect, test } from '@playwright/test';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000';

/**
 * Camino feliz del repaso SRS (E5): completar una lección genera SrsCard, y
 * la pantalla /repaso las sirve como flashcard clásica (ver → revelar →
 * calificar). No asume un número fijo de tarjetas pendientes (el estado del
 * usuario dev es compartido entre ejecuciones), solo que:
 * 1. completar la lección no falla (idempotente si ya se había completado).
 * 2. /repaso muestra o bien una tarjeta jugable, o bien el estado vacío.
 * 3. revelar + calificar no rompe la pantalla y hace avanzar la sesión.
 */
test('completa una lección, genera SrsCard y permite repasar una tarjeta', async ({
  page,
  request,
}) => {
  const completeResponse = await request.post(
    `${API_URL}/lessons/a1-l01-hallo/complete`,
  );
  expect(completeResponse.ok()).toBeTruthy();
  const body = (await completeResponse.json()) as { vocabCount: number };
  expect(body.vocabCount).toBeGreaterThan(0);

  await page.goto('/repaso');

  const emptyState = page.getByText('No hay tarjetas pendientes hoy.');
  const showAnswer = page.getByRole('button', { name: 'Mostrar respuesta' });

  await expect(emptyState.or(showAnswer)).toBeVisible();

  if (await showAnswer.isVisible()) {
    await showAnswer.click();
    await page.getByRole('button', { name: 'Bien' }).click();

    // Tras calificar: o avanza a la siguiente tarjeta, o cierra la sesión
    // (completada / sin tarjetas) — cualquiera de las tres es una pantalla
    // válida, ninguna es un error o un cuelgue.
    await expect(
      page
        .getByText(/Tarjeta \d+ de \d+/)
        .or(page.getByText('¡Repaso completado!'))
        .or(page.getByText('No hay tarjetas pendientes hoy.')),
    ).toBeVisible();
  }
});
