import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

/**
 * Puerto de depuración remota de Chromium que usa Lighthouse para conectarse
 * a la MISMA instancia del navegador que controla Playwright. El spec debe
 * declararlo con:
 *   test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });
 * (workers: 1 en playwright.config.ts, así que no hay choque de puertos).
 */
export const PUERTO_LIGHTHOUSE = 9333;

export interface ResultadoLighthouse {
  puntaje: number | null;
  auditoriasFallidas: { id: string; titulo: string }[];
  archivoHtml: string;
}

/**
 * Ejecuta Lighthouse (categoría accesibilidad) en modo *snapshot* sobre el
 * estado actual de la página: la sesión, el modal abierto o el mensaje de
 * error que dejó el test. El modo *navigation* de Lighthouse CI recarga la
 * URL y el JWT (que vive solo en memoria) se pierde, auditando el login en
 * vez de la pantalla evaluada.
 *
 * Guarda <carpeta-del-TC>/resultados/lighthouse-<TC>-<paso>.html y .json.
 */
export async function auditarLighthouse(
  page: Page,
  tcId: string,
  dirDelSpec: string,
  paso: string,
): Promise<ResultadoLighthouse> {
  // lighthouse y puppeteer-core son ESM: import dinámico desde el spec CommonJS
  const { startFlow } = await import('lighthouse');
  const puppeteer = (await import('puppeteer-core')).default;

  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${PUERTO_LIGHTHOUSE}`,
    defaultViewport: null,
  });
  try {
    const url = page.url();
    const paginas = await browser.pages();
    const destino = paginas.find((p) => p.url() === url);
    if (!destino) throw new Error(`Lighthouse: no se encontró la pestaña ${url} en el navegador de Playwright`);

    const flow = await startFlow(destino, {
      name: `${tcId} - ${paso}`,
      config: {
        extends: 'lighthouse:default',
        settings: {
          onlyCategories: ['accessibility'],
          formFactor: 'desktop',
          // Sin emulación: se audita el viewport real del proyecto de Playwright
          screenEmulation: { disabled: true },
          locale: 'es',
        },
      },
    });
    await flow.snapshot({ name: paso });

    const carpeta = path.join(dirDelSpec, 'resultados');
    fs.mkdirSync(carpeta, { recursive: true });
    const base = path.join(carpeta, `lighthouse-${tcId}-${paso}`);
    fs.writeFileSync(`${base}.html`, await flow.generateReport(), 'utf-8');

    const lhr = (await flow.createFlowResult()).steps[0].lhr;
    fs.writeFileSync(`${base}.json`, JSON.stringify(lhr, null, 2), 'utf-8');

    const categoria = lhr.categories.accessibility;
    const auditoriasFallidas = categoria.auditRefs
      .map((ref) => lhr.audits[ref.id])
      .filter((a) => a.score === 0)
      .map((a) => ({ id: a.id, titulo: a.title }));

    return { puntaje: categoria.score, auditoriasFallidas, archivoHtml: `${base}.html` };
  } finally {
    // disconnect (no close): el navegador lo sigue controlando Playwright
    await browser.disconnect();
  }
}
