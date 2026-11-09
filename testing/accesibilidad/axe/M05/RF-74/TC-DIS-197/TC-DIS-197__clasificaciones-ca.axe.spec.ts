// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-197 RF-74: badge + texto en las 4 clasificaciones del CA    |
/**
 * TC-DIS-197 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de badge + texto en las 4 clasificaciones del CA
 * (Excelente, Aceptable, Baja, Crítica)
 * RF-74 · CU-02 Calcular y Consultar Eficiencia Alimenticia (ICA) · Rol: Productor, Veterinario o Administrador
 * Suministros → Eficiencia (ICA) (/suministros/eficiencia), ICA vigente y "Cálculos anteriores"
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (badge/ícono y etiqueta textual, no solo color); 1.4.3
 * (contraste ≥ 4.5:1 en cada badge); 4.1.2 (name/role/value del badge).
 *
 * Datos: en TEST todos los activos están en CA_NO_CALCULABLE. La hoja pide congelar o mockear un
 * activo por clasificación, así que los resultados se simulan ("Datos simulados"). Admin.
 * Tema oscuro: la hoja no lo pide; se revisan solo los badges (1.4.3) y el resto queda anotado.
 * Lector de pantalla: no se ejecuta NVDA; se verifica lo que recibe (texto del badge, ícono oculto).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, ETIQUETAS_WCAG, escanear, irA, main, resumenViolaciones } from '../../../_shared/sigabA11y';
import { CLASIFICACIONES, badges, consultarIca, resultadoIca, sesionDelCaso, simularActivos, simularIca, temaOscuro } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-197';
const LH = ['clasificaciones-claro'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-197 — Clasificaciones del CA con badge y texto', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [1.4.1 / 1.4.3 / 4.1.2] Las 4 clasificaciones en el ICA vigente y en el historial, tema claro y oscuro (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    let actual = CLASIFICACIONES[0];
    const fila = ([c, , ca]: [string, string, string], i: number) => resultadoIca({ id_resultado_ica: 500 + i, clasificacion_ca: c, ca_calculado: ca, es_vigente: i === 0 });
    await simularActivos(page);
    await simularIca(page, () => resultadoIca({ clasificacion_ca: actual[0], ca_calculado: actual[2] }), CLASIFICACIONES.map(fila));
    anotar(testInfo, 'Datos simulados', 'Activo BOV-101 con un resultado por clasificación: CA 2,00 / 3,10 / 4,40 / 5,60.');
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');

    const vigente = page.locator('section[aria-labelledby="ica-vigente"]');
    for (const c of CLASIFICACIONES) {
      actual = c;
      await consultarIca(page, 7001);
      const b = await badges(vigente);
      anotar(testInfo, `ICA vigente ${c[1]}`, JSON.stringify(b));
      expect.soft(b.some((x) => x.texto === c[1]), `1.4.1: el ICA vigente no muestra "${c[1]}" en texto`).toBe(true);
      desviacion(b.every((x) => x.icono && x.iconoOculto), `1.4.1/4.1.2: el badge "${c[1]}" no lleva ícono oculto a la tecnología de asistencia`);
    }

    const tabla = main(page).getByRole('region', { name: 'Cálculos anteriores' }).locator('table');
    const enTabla = await badges(tabla);
    anotar(testInfo, 'Badges del historial', enTabla.map((x) => `${x.texto}${x.icono ? ' +ícono' : ''}`).join(' ¦ '));
    expect.soft(enTabla.map((x) => x.texto), '1.4.1: el historial no muestra las 4 clasificaciones en texto').toEqual(CLASIFICACIONES.map((c) => c[1]));
    desviacion(enTabla.every((x) => x.icono && x.iconoOculto), '1.4.1/4.1.2: hay badges del historial sin ícono o con ícono expuesto');
    const nombres = await tabla.locator('.ds-badge').evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()));
    expect.soft(nombres.every(Boolean), '4.1.2: un badge no expone texto a la tecnología de asistencia').toBe(true);

    await escanear(page, TC_ID, __dirname, 'clasificaciones-claro', testInfo, LH);

    // Tema oscuro: el criterio 1.4.3 se limita a los badges. Lo demás de la página se deja anotado, sin decidir el caso.
    await temaOscuro(page, true);
    const pasoOscuro = `badges-oscuro-${testInfo.project.name}`;
    const axeBadges = await new AxeBuilder({ page }).include('.ds-badge').withTags(ETIQUETAS_WCAG).analyze();
    guardarResultadoAxe(TC_ID, __dirname, pasoOscuro, axeBadges);
    expect.soft(axeBadges.violations, `1.4.3: violaciones en los badges en tema oscuro:
${resumenViolaciones(axeBadges.violations)}`).toEqual([]);
    const axePagina = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    const fuera = axePagina.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.html.slice(0, 90)}`));
    anotar(testInfo, 'Tema oscuro, fuera del criterio (no son badges)', fuera.join(' ¦ ') || '(ninguna)');
  });
});
