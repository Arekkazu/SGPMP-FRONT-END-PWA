# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g024.pw.ts >> TC-M08-G024 rendimiento Chromium y WebKit (CP-01 a CP-06)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G024\tc-m08-g024.pw.ts:506:1

# Error details

```
Error: CP-01, CP-02, CP-03, CP-04

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  604 |     for (let i = 0; i < 20; i += 1) {
  605 |       const x = zAntes.box.x + ((i + 0.5) / 20) * zAntes.box.width;
  606 |       const h0 = Date.now();
  607 |       await page.mouse.move(x, yMid);
  608 |       await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  609 |       hoverMs.push(Date.now() - h0);
  610 |     }
  611 |     observaciones.push(`Hover (20 movimientos en Chromium con 1.000 eventos): mediana=${mediana(hoverMs)} ms, maximo=${Math.max(...hoverMs)} ms.`);
  612 |   }
  613 |   await captura(page, 'chromium_1000');
  614 | 
  615 |   // -- A.4 CP-06: 2.000 eventos
  616 |   const m2000 = await medir(page, '2000', etiqueta);
  617 |   precondicion('Respuesta simulada 2000 servida en Chromium', simulados['2000'] === 1, `2000=${simulados['2000']}`);
  618 |   const pagGrafica = await page.evaluate(() => {
  619 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  620 |     const h3Linea = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Línea de tiempo');
  621 |     const cardLinea = h3Linea?.parentElement;
  622 |     const h3Pend = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Predicciones sin evaluar (más de 48 horas)');
  623 |     const cardPend = h3Pend?.parentElement;
  624 |     if (!cardLinea) return [] as string[];
  625 |     const rePag = /anterior|siguiente|página|pagina|cargar|más|mas/i;
  626 |     return Array.from(cardLinea.querySelectorAll('button, [role="button"]'))
  627 |       .filter((b) => (!cardPend || !cardPend.contains(b)) && rePag.test(n(b.textContent)))
  628 |       .map((b) => n(b.textContent));
  629 |   });
  630 |   // Observación (reintento 1): avisos de la gráfica y estado de los botones de la línea de tiempo con 2.000 marcadores.
  631 |   const estado2000 = await page.evaluate(() => {
  632 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  633 |     const h3 = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Línea de tiempo');
  634 |     const card = h3?.parentElement;
  635 |     if (!card) return { avisos: [] as string[], botones: [] as string[] };
  636 |     const avisos = Array.from(card.querySelectorAll('[role="status"]')).map((el) => n(el.textContent)).filter(Boolean);
  637 |     const grupo = card.querySelector('[role="group"]');
  638 |     const botones = grupo
  639 |       ? Array.from(grupo.querySelectorAll('button')).map((b) => `${n(b.textContent)}${(b as HTMLButtonElement).disabled ? ' (deshabilitado)' : ''}`)
  640 |       : [];
  641 |     return { avisos, botones };
  642 |   });
  643 |   observaciones.push(`Con 2.000 marcadores: avisos de la gráfica=${JSON.stringify(estado2000.avisos)}; botones de la línea de tiempo=${JSON.stringify(estado2000.botones)}.`);
  644 |   const dibujados = m2000.Lp + m2000.Sp;
  645 |   const ok06 = dibujados < 2000 || pagGrafica.length > 0;
  646 |   anotar(
  647 |     'CP-06',
  648 |     ok06,
  649 |     `dibujados=${dibujados} de recibidos=2000 (${m2000.Lp}/1460, ${m2000.Sp}/540), paginador=${pagGrafica.length} [${pagGrafica.join(', ')}]`,
  650 |   );
  651 | 
  652 |   // -- A.5 Guardar storageState y cerrar contexto Chromium ANTES de lanzar WebKit
  653 |   const estado = await context.storageState();
  654 |   await page.goto('about:blank');
  655 |   await context.close();
  656 | 
  657 |   // -- B. WebKit (sin nuevo login; sesion via cookie de refresco)
  658 |   const wb = await webkit.launch();
  659 |   const webkitNav = `WebKit ${wb.version()}`;
  660 |   observaciones.push(`WebKit versión: ${wb.version()}.`);
  661 |   const ctxW = await wb.newContext({
  662 |     storageState: estado,
  663 |     serviceWorkers: 'block',
  664 |     viewport: { width: 1366, height: 768 },
  665 |     locale: 'es-CO',
  666 |     timezoneId: 'America/Bogota',
  667 |   });
  668 |   await registrarRutas(ctxW);
  669 |   const pW = await ctxW.newPage();
  670 |   try {
  671 |     escenarioActual = null;
  672 |     await pW.goto(`${BASE}prediccion/historial-predictivo`);
  673 |     await pW.waitForTimeout(2_000);
  674 |     precondicion('Sesión activa en WebKit sin nuevo login', !pW.url().endsWith('/login'), `URL en WebKit: ${new URL(pW.url()).pathname}`);
  675 | 
  676 |     const meds03: Medicion[] = [];
  677 |     for (let k = 0; k < 3; k += 1) meds03.push(await medir(pW, '365d', etiqueta));
  678 |     const r03 = resumirTres(meds03, webkitNav);
  679 |     anotar('CP-03', r03.ok, r03.obtenido);
  680 | 
  681 |     const meds04: Medicion[] = [];
  682 |     for (let k = 0; k < 3; k += 1) meds04.push(await medir(pW, '1000', etiqueta));
  683 |     const r04 = resumirTres(meds04, webkitNav);
  684 |     anotar('CP-04', r04.ok, r04.obtenido);
  685 | 
  686 |     await captura(pW, 'webkit_1000');
  687 |   } finally {
  688 |     await pW.goto('about:blank').catch(() => undefined);
  689 |     await ctxW.close().catch(() => undefined);
  690 |     await wb.close().catch(() => undefined);
  691 |   }
  692 | 
  693 |   // -- C. Precondicion del bundle (scripts recolectados en Chromium)
  694 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  695 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  696 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  697 |   precondicion(
  698 |     'El frontend desplegado contiene "Línea de tiempo" y "Cargando historial..."',
  699 |     todo.includes('Línea de tiempo') && todo.includes('Cargando historial...'),
  700 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`,
  701 |   );
  702 | 
  703 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 704 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-01, CP-02, CP-03, CP-04
  705 | });
  706 | 
```