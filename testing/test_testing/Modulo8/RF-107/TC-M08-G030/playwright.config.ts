// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-21 | Juan Sebastian Gutierrez | Config Playwright de TC-M08-G030 (RF-107: TC-M08-072, 073 y 069 c): base G024 (Chromium + WebKit lanzado en el spec con storageState), retries 0, workers 1, sin traza ni video |
// Config propio de TC-M08-G030 (parte Playwright). No usa ni modifica testing/playwright.config.ts.
import { defineConfig, devices } from '@playwright/test';

const staging = process.env.STAGING_DIR ?? '.';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.pw\.ts$/,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 900_000,
  outputDir: `${staging}/pw-salida`,
  use: {
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    serviceWorkers: 'block',
    viewport: { width: 1366, height: 768 },
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 },
        // Solo para pruebas locales con binario alterno; en el equipo no se define.
        ...(process.env.QA_CHROME_PATH ? { launchOptions: { executablePath: process.env.QA_CHROME_PATH } } : {}),
      },
    },
  ],
});
