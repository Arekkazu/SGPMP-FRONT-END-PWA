/**
 * Reporte Lighthouse (modo SNAPSHOT) por caso TC-DIS-XX de M09.
 *
 * Uso (desde testing/):
 *   node accesibilidad/axe/_shared/lighthouseSnapshot.mjs TC-DIS-72
 *
 * Por qué snapshot y no navegación: el JWT vive solo en memoria, así que cualquier
 * recarga o page.goto() después del login cae en /login. El modo snapshot de la user
 * flow API (startFlow + flow.snapshot()) audita el DOM tal como está, sin recargar.
 *
 * Flujo: 1 login con testing/.env.test → clic en "Configuración" del sidebar → clic en
 * la pestaña del caso (misma ruta que su spec) → snapshot a 1440x900 → guarda
 * resultados/lighthouse-TC-DIS-XX.html junto al spec. Solo hace clics de navegación:
 * no escribe nada en la cuenta.
 *
 * Usa el Chromium que ya instaló Playwright (puppeteer-core no descarga navegador).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dotenv = require('dotenv');

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TESTING = path.resolve(AQUI, '../../..');
dotenv.config({ path: path.join(TESTING, '.env.test') });

const BASE = 'https://api.inmero.co';
// Pestaña de Configuración que abre cada spec (null = el caso se queda en /dashboard).
const PESTANA = {
  'TC-DIS-63': 'IoT',
  'TC-DIS-66': 'IoT',
  'TC-DIS-69': null,
  'TC-DIS-72': 'Personalización',
  'TC-DIS-75': 'Personalización',
  'TC-DIS-78': 'Personalización',
  'TC-DIS-81': 'Personalización',
  'TC-DIS-84': 'Plantillas',
  'TC-DIS-87': 'Plantillas',
};

const tc = process.argv[2];
if (!(tc in PESTANA)) {
  console.error(`Caso no soportado: ${tc}. Opciones: ${Object.keys(PESTANA).join(', ')}`);
  process.exit(1);
}
const { TEST_ADMIN_EMAIL: EMAIL, TEST_ADMIN_PASSWORD: PASSWORD } = process.env;
if (!EMAIL || !PASSWORD) {
  console.error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  process.exit(1);
}

function carpetaDelSpec(id) {
  const raiz = path.join(TESTING, 'accesibilidad', 'axe', 'M09');
  for (const rf of fs.readdirSync(raiz)) {
    const dir = path.join(raiz, rf, id);
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(`No se encontró la carpeta del spec de ${id}`);
}

async function asentar(page) {
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 30_000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}

const browser = await puppeteer.launch({
  executablePath: chromium.executablePath(),
  headless: true,
  defaultViewport: { width: 1440, height: 900 },
});

let salida = 0;
try {
  const page = await browser.newPage();

  // ── Login (una sola vez) ────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.locator('input[autocomplete="email"]').fill(EMAIL);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.locator('::-p-aria(Ingresar[role="button"])').click();
  try {
    await page.waitForFunction(() => location.pathname.includes('dashboard'), { timeout: 90_000 });
  } catch {
    throw new Error('LOGIN FALLIDO: no se llegó a /dashboard (no reintentar: la cuenta se bloquea).');
  }
  await asentar(page);

  // ── Navegación por clics, igual que el spec ─────────────────────────────
  const pestana = PESTANA[tc];
  if (pestana) {
    await page.locator('::-p-aria(Configuración[role="link"])').click();
    await page.waitForFunction(() => location.pathname.includes('configuracion'), { timeout: 30_000 });
    await asentar(page);
    await page.locator(`::-p-aria(${pestana}[role="button"])`).click();
    await asentar(page);
  }
  console.log(`[${tc}] auditando ${page.url()} (pestaña: ${pestana ?? 'ninguna, dashboard'})`);

  // ── Snapshot Lighthouse ─────────────────────────────────────────────────
  const flow = await startFlow(page, {
    name: `${tc} — snapshot en TEST`,
    config: {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['accessibility', 'best-practices'],
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
        locale: 'es',
      },
    },
  });
  await flow.snapshot({ name: `${tc} · ${pestana ?? 'dashboard'}` });

  const html = await flow.generateReport();
  const resultados = path.join(carpetaDelSpec(tc), 'resultados');
  fs.mkdirSync(resultados, { recursive: true });
  const archivo = path.join(resultados, `lighthouse-${tc}.html`);
  fs.writeFileSync(archivo, html, 'utf-8');

  // Resumen para la consola (no se guarda en el repo).
  const { steps } = await flow.createFlowResult();
  const lhr = steps[0].lhr;
  const puntaje = (id) => (lhr.categories[id]?.score == null ? 'n/a' : Math.round(lhr.categories[id].score * 100));
  const fallidas = lhr.categories.accessibility.auditRefs
    .map((ref) => ({ ref, a: lhr.audits[ref.id] }))
    .filter(({ a }) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
    .map(({ ref, a }) => `${a.id} (nodos=${a.details?.items?.length ?? 0}, peso=${ref.weight})`);
  console.log(JSON.stringify({
    tc, url: lhr.finalDisplayedUrl, accesibilidad: puntaje('accessibility'),
    buenasPracticas: puntaje('best-practices'), fallidasAccesibilidad: fallidas, archivo,
  }));
} catch (e) {
  console.error(`[${tc}] ERROR: ${e.message}`);
  salida = 2;
} finally {
  await browser.close();
}
process.exit(salida);
