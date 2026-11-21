// Config auxiliar solo para el control playwright_guardia de TC-M08-G022 (no es parte de la corrida oficial).
import { defineConfig, devices } from '@playwright/test';

const staging = process.env.STAGING_DIR ?? '.';

export default defineConfig({
  testDir: 'C:/Users/Juansegutt/.gemini/antigravity/brain/fba4f544-b319-46fe-9419-fe3e7a91aaf0/scratch',
  testMatch: /control_guardia\.pw\.ts$/,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 300_000,
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
      },
    },
  ],
});
