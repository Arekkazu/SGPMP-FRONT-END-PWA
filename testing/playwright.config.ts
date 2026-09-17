import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: '.', // <--- Permite buscar dentro de accesibilidad/axe/ y visual/
  testMatch: /.*\.(visual|axe)\.spec\.ts$/, // <--- Corre axe y visual; ignora node_modules
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // TEMPORAL (re-ejecución 3, 2026-09-16): se detectaron caídas de resolución
  // DNS intermitentes contra el host de staging durante la corrida larga (ver
  // hallazgo de estabilidad de red en el reporte de re-ejecución). Un retry
  // evita perder una corrida completa por un corte transitorio de red.
  retries: process.env.CI ? 2 : 1,
  // TEMPORAL (re-ejecución 3, 2026-09-16): el login admin mide ~66s hasta el
  // redirect a /dashboard contra el ambiente de staging actual (ver hallazgo
  // de latencia de login en el reporte de re-ejecución). El timeout por
  // defecto de Playwright (30s) hace fallar el beforeEach de casi todos los
  // specs antes de llegar siquiera a la pantalla evaluada. Se sube a 120s
  // solo para poder medir accesibilidad/visual reales en esta ejecución.
  timeout: 30_000,
  // Fijo en 1 siempre (no solo en CI): la mayoría de specs inician sesión con
  // la MISMA cuenta de prueba (TEST_USER_EMAIL). Con más de un worker, varios
  // logins concurrentes contra esa cuenta disparan el bloqueo por seguridad
  // del backend ("múltiples intentos fallidos"), tumbando la corrida entera.
  workers: 1,
  reporter: 'html',

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
});