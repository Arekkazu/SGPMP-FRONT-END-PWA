import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
 testing
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',

 test

  use: {
    /* Es buena práctica incluir la diagonal final */
    baseURL: 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'movil',
      /* Si buscas solo probar layout responsive y accesibilidad: */
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } },
      
      /* Si prefieres emulación móvil real (touch, user-agent móvil): */
      // use: { ...devices['iPhone 12'] },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
      
      /* Alternativa para emulación tablet real: */
      // use: { ...devices['iPad Mini'] },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
testing

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
 test
});