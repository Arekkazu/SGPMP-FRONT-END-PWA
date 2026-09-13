import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: '.', // <--- Permite buscar dentro de accesibilidad/axe/ y visual/
  testMatch: /.*\.(visual|axe)\.spec\.ts$/, // <--- Corre axe y visual; ignora node_modules
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Fijo en 1 siempre (no solo en CI): la mayoría de specs inician sesión con
  // la MISMA cuenta de prueba (TEST_USER_EMAIL). Con más de un worker, varios
  // logins concurrentes contra esa cuenta disparan el bloqueo por seguridad
  // del backend ("múltiples intentos fallidos"), tumbando la corrida entera.
  workers: 1,
  reporter: 'html',

  use: {
    /* Es buena práctica incluir la diagonal final */
    baseURL: 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io/login',
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
});