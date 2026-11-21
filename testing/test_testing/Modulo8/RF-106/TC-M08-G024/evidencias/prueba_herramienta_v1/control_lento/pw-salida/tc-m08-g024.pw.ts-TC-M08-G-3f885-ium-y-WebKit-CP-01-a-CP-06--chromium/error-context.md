# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g024.pw.ts >> TC-M08-G024 rendimiento Chromium y WebKit (CP-01 a CP-06)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G024\tc-m08-g024.pw.ts:505:1

# Error details

```
Error: CP-01, CP-02, CP-03, CP-04, CP-05, CP-06

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  589 |   }
  590 |   const zDespues = await leerZoomBase();
  591 |   const etiquetasCambian = zAntes.etiquetas.length > 0 && JSON.stringify(zAntes.etiquetas) !== JSON.stringify(zDespues.etiquetas);
  592 |   const ok05 = zAntes.brush > 0 || zAntes.botonesZoom > 0 || zAntes.scrollHorizontal > 0 || etiquetasCambian;
  593 |   anotar(
  594 |     'CP-05',
  595 |     ok05,
  596 |     `brush=${zAntes.brush}, botones_zoom=${zAntes.botonesZoom}, scroll_horizontal=${zAntes.scrollHorizontal}, etiquetas_cambian=${etiquetasCambian}, antes=[${zAntes.etiquetas.slice(0, 8).join(', ')}], despues=[${zDespues.etiquetas.slice(0, 8).join(', ')}]`,
  597 |   );
  598 | 
  599 |   // Observacion de hover (20 movimientos sobre el area de trazado)
  600 |   if (zAntes.box) {
  601 |     const hoverMs: number[] = [];
  602 |     const yMid = zAntes.box.y + zAntes.box.height / 2;
  603 |     for (let i = 0; i < 20; i += 1) {
  604 |       const x = zAntes.box.x + ((i + 0.5) / 20) * zAntes.box.width;
  605 |       const h0 = Date.now();
  606 |       await page.mouse.move(x, yMid);
  607 |       await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  608 |       hoverMs.push(Date.now() - h0);
  609 |     }
  610 |     observaciones.push(`Hover (20 movimientos en Chromium con 1.000 eventos): mediana=${mediana(hoverMs)} ms, maximo=${Math.max(...hoverMs)} ms.`);
  611 |   }
  612 |   await captura(page, 'chromium_1000');
  613 | 
  614 |   // -- A.4 CP-06: 2.000 eventos
  615 |   const m2000 = await medir(page, '2000', etiqueta);
  616 |   precondicion('Respuesta simulada 2000 servida en Chromium', simulados['2000'] === 1, `2000=${simulados['2000']}`);
  617 |   const pagGrafica = await page.evaluate(() => {
  618 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  619 |     const h3Linea = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Línea de tiempo');
  620 |     const cardLinea = h3Linea?.parentElement;
  621 |     const h3Pend = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Predicciones sin evaluar (más de 48 horas)');
  622 |     const cardPend = h3Pend?.parentElement;
  623 |     if (!cardLinea) return [] as string[];
  624 |     const rePag = /anterior|siguiente|página|pagina|cargar|más|mas/i;
  625 |     return Array.from(cardLinea.querySelectorAll('button, [role="button"]'))
  626 |       .filter((b) => (!cardPend || !cardPend.contains(b)) && rePag.test(n(b.textContent)))
  627 |       .map((b) => n(b.textContent));
  628 |   });
  629 |   const dibujados = m2000.Lp + m2000.Sp;
  630 |   const ok06 = dibujados < 2000 || pagGrafica.length > 0;
  631 |   anotar(
  632 |     'CP-06',
  633 |     ok06,
  634 |     `dibujados=${dibujados} de recibidos=2000 (${m2000.Lp}/1460, ${m2000.Sp}/540), paginador=${pagGrafica.length} [${pagGrafica.join(', ')}]`,
  635 |   );
  636 | 
  637 |   // -- A.5 Guardar storageState y cerrar contexto Chromium ANTES de lanzar WebKit
  638 |   const estado = await context.storageState();
  639 |   await page.goto('about:blank');
  640 |   await context.close();
  641 | 
  642 |   // -- B. WebKit (sin nuevo login; sesion via cookie de refresco)
  643 |   const wb = await webkit.launch();
  644 |   const webkitNav = `WebKit ${wb.version()}`;
  645 |   observaciones.push(`WebKit versión: ${wb.version()}.`);
  646 |   const ctxW = await wb.newContext({
  647 |     storageState: estado,
  648 |     serviceWorkers: 'block',
  649 |     viewport: { width: 1366, height: 768 },
  650 |     locale: 'es-CO',
  651 |     timezoneId: 'America/Bogota',
  652 |   });
  653 |   await registrarRutas(ctxW);
  654 |   const pW = await ctxW.newPage();
  655 |   try {
  656 |     escenarioActual = null;
  657 |     await pW.goto(`${BASE}prediccion/historial-predictivo`);
  658 |     await pW.waitForTimeout(2_000);
  659 |     precondicion('Sesión activa en WebKit sin nuevo login', !pW.url().endsWith('/login'), `URL en WebKit: ${new URL(pW.url()).pathname}`);
  660 | 
  661 |     const meds03: Medicion[] = [];
  662 |     for (let k = 0; k < 3; k += 1) meds03.push(await medir(pW, '365d', etiqueta));
  663 |     const r03 = resumirTres(meds03, webkitNav);
  664 |     anotar('CP-03', r03.ok, r03.obtenido);
  665 | 
  666 |     const meds04: Medicion[] = [];
  667 |     for (let k = 0; k < 3; k += 1) meds04.push(await medir(pW, '1000', etiqueta));
  668 |     const r04 = resumirTres(meds04, webkitNav);
  669 |     anotar('CP-04', r04.ok, r04.obtenido);
  670 | 
  671 |     await captura(pW, 'webkit_1000');
  672 |   } finally {
  673 |     await pW.goto('about:blank').catch(() => undefined);
  674 |     await ctxW.close().catch(() => undefined);
  675 |     await wb.close().catch(() => undefined);
  676 |   }
  677 | 
  678 |   // -- C. Precondicion del bundle (scripts recolectados en Chromium)
  679 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  680 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  681 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  682 |   precondicion(
  683 |     'El frontend desplegado contiene "Línea de tiempo" y "Cargando historial..."',
  684 |     todo.includes('Línea de tiempo') && todo.includes('Cargando historial...'),
  685 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`,
  686 |   );
  687 | 
  688 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 689 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-01, CP-02, CP-03, CP-04, CP-05, CP-06
  690 | });
  691 | 
```