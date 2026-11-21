# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control_exportar.pw.ts >> TC-M08-G024 rendimiento Chromium y WebKit (CP-01 a CP-06)
- Location: ..\..\.gemini\antigravity\brain\ae34bc1d-8cba-4e7c-8a4f-648b731eabc8\scratch\qa_g024_exportar\control_exportar.pw.ts:505:1

# Error details

```
Error: POST /sigab-test/api/reportes

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "POST /sigab-test/api/reportes",
+ ]
```

# Test source

```ts
  590 |     await page.waitForTimeout(600);
  591 |   }
  592 |   const zDespues = await leerZoomBase();
  593 |   const etiquetasCambian = zAntes.etiquetas.length > 0 && JSON.stringify(zAntes.etiquetas) !== JSON.stringify(zDespues.etiquetas);
  594 |   const ok05 = zAntes.brush > 0 || zAntes.botonesZoom > 0 || zAntes.scrollHorizontal > 0 || etiquetasCambian;
  595 |   anotar(
  596 |     'CP-05',
  597 |     ok05,
  598 |     `brush=${zAntes.brush}, botones_zoom=${zAntes.botonesZoom}, scroll_horizontal=${zAntes.scrollHorizontal}, etiquetas_cambian=${etiquetasCambian}, antes=[${zAntes.etiquetas.slice(0, 8).join(', ')}], despues=[${zDespues.etiquetas.slice(0, 8).join(', ')}]`,
  599 |   );
  600 | 
  601 |   // Observacion de hover (20 movimientos sobre el area de trazado)
  602 |   if (zAntes.box) {
  603 |     const hoverMs: number[] = [];
  604 |     const yMid = zAntes.box.y + zAntes.box.height / 2;
  605 |     for (let i = 0; i < 20; i += 1) {
  606 |       const x = zAntes.box.x + ((i + 0.5) / 20) * zAntes.box.width;
  607 |       const h0 = Date.now();
  608 |       await page.mouse.move(x, yMid);
  609 |       await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  610 |       hoverMs.push(Date.now() - h0);
  611 |     }
  612 |     observaciones.push(`Hover (20 movimientos en Chromium con 1.000 eventos): mediana=${mediana(hoverMs)} ms, maximo=${Math.max(...hoverMs)} ms.`);
  613 |   }
  614 |   await captura(page, 'chromium_1000');
  615 | 
  616 |   // -- A.4 CP-06: 2.000 eventos
  617 |   const m2000 = await medir(page, '2000', etiqueta);
  618 |   precondicion('Respuesta simulada 2000 servida en Chromium', simulados['2000'] === 1, `2000=${simulados['2000']}`);
  619 |   const pagGrafica = await page.evaluate(() => {
  620 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  621 |     const h3Linea = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Línea de tiempo');
  622 |     const cardLinea = h3Linea?.parentElement;
  623 |     const h3Pend = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Predicciones sin evaluar (más de 48 horas)');
  624 |     const cardPend = h3Pend?.parentElement;
  625 |     if (!cardLinea) return [] as string[];
  626 |     const rePag = /anterior|siguiente|página|pagina|cargar|más|mas/i;
  627 |     return Array.from(cardLinea.querySelectorAll('button, [role="button"]'))
  628 |       .filter((b) => (!cardPend || !cardPend.contains(b)) && rePag.test(n(b.textContent)))
  629 |       .map((b) => n(b.textContent));
  630 |   });
  631 |   const dibujados = m2000.Lp + m2000.Sp;
  632 |   const ok06 = dibujados < 2000 || pagGrafica.length > 0;
  633 |   anotar(
  634 |     'CP-06',
  635 |     ok06,
  636 |     `dibujados=${dibujados} de recibidos=2000 (${m2000.Lp}/1460, ${m2000.Sp}/540), paginador=${pagGrafica.length} [${pagGrafica.join(', ')}]`,
  637 |   );
  638 | 
  639 |   // -- A.5 Guardar storageState y cerrar contexto Chromium ANTES de lanzar WebKit
  640 |   const estado = await context.storageState();
  641 |   await page.goto('about:blank');
  642 |   await context.close();
  643 | 
  644 |   // -- B. WebKit (sin nuevo login; sesion via cookie de refresco)
  645 |   const wb = await webkit.launch();
  646 |   const webkitNav = `WebKit ${wb.version()}`;
  647 |   observaciones.push(`WebKit versión: ${wb.version()}.`);
  648 |   const ctxW = await wb.newContext({
  649 |     storageState: estado,
  650 |     serviceWorkers: 'block',
  651 |     viewport: { width: 1366, height: 768 },
  652 |     locale: 'es-CO',
  653 |     timezoneId: 'America/Bogota',
  654 |   });
  655 |   await registrarRutas(ctxW);
  656 |   const pW = await ctxW.newPage();
  657 |   try {
  658 |     escenarioActual = null;
  659 |     await pW.goto(`${BASE}prediccion/historial-predictivo`);
  660 |     await pW.waitForTimeout(2_000);
  661 |     precondicion('Sesión activa en WebKit sin nuevo login', !pW.url().endsWith('/login'), `URL en WebKit: ${new URL(pW.url()).pathname}`);
  662 | 
  663 |     const meds03: Medicion[] = [];
  664 |     for (let k = 0; k < 3; k += 1) meds03.push(await medir(pW, '365d', etiqueta));
  665 |     const r03 = resumirTres(meds03, webkitNav);
  666 |     anotar('CP-03', r03.ok, r03.obtenido);
  667 | 
  668 |     const meds04: Medicion[] = [];
  669 |     for (let k = 0; k < 3; k += 1) meds04.push(await medir(pW, '1000', etiqueta));
  670 |     const r04 = resumirTres(meds04, webkitNav);
  671 |     anotar('CP-04', r04.ok, r04.obtenido);
  672 | 
  673 |     await captura(pW, 'webkit_1000');
  674 |   } finally {
  675 |     await pW.goto('about:blank').catch(() => undefined);
  676 |     await ctxW.close().catch(() => undefined);
  677 |     await wb.close().catch(() => undefined);
  678 |   }
  679 | 
  680 |   // -- C. Precondicion del bundle (scripts recolectados en Chromium)
  681 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  682 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  683 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  684 |   precondicion(
  685 |     'El frontend desplegado contiene "Línea de tiempo" y "Cargando historial..."',
  686 |     todo.includes('Línea de tiempo') && todo.includes('Cargando historial...'),
  687 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`,
  688 |   );
  689 | 
> 690 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
      |                                               ^ Error: POST /sigab-test/api/reportes
  691 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
  692 | });
  693 | 
```