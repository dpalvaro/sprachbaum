import { defineConfig, devices } from '@playwright/test';

/**
 * No arranca web/api (webServer): orquestar la stack completa (Postgres +
 * seed + api + web) es responsabilidad de quien invoca el test —
 * `pnpm dev` en local, el job `e2e` del CI — para no duplicar esa lógica
 * aquí. Este config solo asume que algo ya sirve la app en `baseURL`.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
