# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g021.pw.ts >> TC-M08-G021 parte navegador real (CP-10 a CP-17)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G021\tc-m08-g021.pw.ts:241:1

# Error details

```
Error: CP-14, CP-16

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  301 |   const grupo = kGrupo >= 0 ? h.grupos[kGrupo] : null;
  302 |   const posE = grupo ? grupo.findIndex((m) => clase(m) === 'EVENTO_SANITARIO' && Number(m.id_evento) === EVT_C) : -1;
  303 |   const posP = grupo ? grupo.findIndex((m) => clase(m) === 'PREDICCION' && String(m.id_resultado_inferencia).startsWith(PRED_C)) : -1;
  304 |   anotar('CP-12', !!grupo && posE >= 0 && posP >= 0 && posE < posP,
  305 |     grupo ? `grupo ${kGrupo + 1} de ${h.grupos.length}: [${grupo.map((m) => `${nombreMarcador(m)}@${m.fecha}`).join(', ')}]` : `(sin grupo; ${h.grupos.length} grupos)`);
  306 |   const calculados = new Map<string, number>();
  307 |   for (const p of h.predicciones) for (const e of h.eventos_sanitarios) {
  308 |     const d = Math.abs(ms(e.fecha) - ms(p.fecha));
  309 |     if (d <= VENTANA_H * HORA_MS) calculados.set(`${corto(p.id_resultado_inferencia)}-${e.id_evento}`, Math.floor(d / 60_000));
  310 |   }
  311 |   const backend = new Map(h.correspondencias.map((c) => [`${corto(c.id_resultado_inferencia)}-${c.id_evento}`, c.diferencia_minutos] as const));
  312 |   const iguales = calculados.size === backend.size && [...calculados].every(([k, v]) => backend.get(k) === v);
  313 |   const lista = (m: Map<string, number>) => `[${[...m].map(([k, v]) => `${k}:${v}`).sort().join(', ')}]`;
  314 |   anotar('CP-13', iguales, `calculados=${lista(calculados)}; backend=${lista(backend)}`);
  315 |   observaciones.push(`Datos reales del ${ACTIVO}: ventana=${h.ventana_correspondencia_horas} h; ${h.predicciones.length} predicciones, ${h.eventos_sanitarios.length} eventos, ${h.retroalimentaciones.length} retroalimentaciones; correspondencias=[${h.correspondencias.map((c) => `${corto(c.id_resultado_inferencia)}-${c.id_evento} ${c.diferencia_minutos} min "${c.diferencia}" colision=${c.colision}`).join('; ')}]; grupos=[${h.grupos.map((g) => `(${g.map(nombreMarcador).join(', ')})`).join('; ')}]; "tipo" de los eventos en la respuesta: [${h.eventos_sanitarios.map((e) => `${e.id_evento}:${String(e.tipo)}`).join(', ')}]`);
  316 | 
  317 |   // -- Vista en Lineal
  318 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  319 |   const gL = await esperarEstable(page);
  320 |   const conteoOk = (g: Grafica) => g.puntos.length === h.predicciones.length && g.eventos.length === h.eventos_sanitarios.length;
  321 |   const conteo = (g: Grafica) => `puntos=${g.puntos.length}/${h.predicciones.length}; eventos=${g.eventos.length}/${h.eventos_sanitarios.length}`;
  322 |   await captura(page, 'linea_tiempo');
  323 |   const medirModo = async (g: Grafica) => {
  324 |     if (!conteoOk(g)) return { ok14: false, ok15: false, ok16: false, d14: conteo(g), d15: conteo(g), d16: conteo(g), tooltips: [] as string[] };
  325 |     const ev = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol path')).map((el) => {
  326 |       const r = el.getBoundingClientRect(); return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
  327 |     }));
  328 |     const cA = conectores(g, g.puntos[iPredA], g.eventos[jA]);
  329 |     const tA = await tooltipEn(page, jA, ev[jA].px, ev[jA].py);
  330 |     const cB = conectores(g, g.puntos[iPredB], g.eventos[jB]);
  331 |     const tam = grupo?.length ?? 2;
  332 |     const xs = [g.puntos[iPredC].x, g.eventos[jC].x];
  333 |     const marc = g.grupos.filter((m) => m.n === tam && m.x >= Math.min(...xs) - 3 && m.x <= Math.max(...xs) + 3);
  334 |     const tooltips: string[] = [];
  335 |     for (let j = 0; j < h.eventos_sanitarios.length; j += 1) tooltips.push(`${h.eventos_sanitarios[j].id_evento}: "${await tooltipEn(page, j, ev[j].px, ev[j].py)}"`);
  336 |     return {
  337 |       ok14: cA === 1 && tA.includes('Diferencia: 10 h'), ok15: cB === 0, ok16: marc.length >= 1,
  338 |       d14: `conectores_${PRED_A}_${EVT_A}=${cA}; texto_al_pasar_el_raton="${tA}"`,
  339 |       d15: `conectores_${PRED_B}_${EVT_B}=${cB}`,
  340 |       d16: `marcadores "N eventos" en la gráfica=[${g.grupos.map((m) => `"${m.texto}"@x=${m.x.toFixed(1)}`).join(', ')}] (miembros x=${xs.map((v) => v.toFixed(1)).join('/')}, N=${tam})`,
  341 |       tooltips,
  342 |     };
  343 |   };
  344 |   const mL = await medirModo(gL);
  345 |   const puntosEnGrupo = conteoOk(gL) ? gL.puntos.filter((p) => Math.abs(p.x - gL.puntos[iPredC].x) <= 3).length : -1;
  346 |   const eventosEnGrupo = conteoOk(gL) ? gL.eventos.filter((e) => Math.abs(e.x - gL.eventos[jC].x) <= 3).length : -1;
  347 | 
  348 |   // -- Vista en Agrupada
  349 |   const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  350 |   await page.getByRole('radio', { name: 'Agrupada' }).check();
  351 |   const rAgr = await respAgrupado;
  352 |   precondicion(`GET /historial-predictivo/${ACTIVO} (Agrupada) responde 200`, rAgr.status() === 200, `HTTP ${rAgr.status()}`);
  353 |   const hA = (await rAgr.json()) as Historial;
  354 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  355 |   const gA = await esperarEstable(page);
  356 |   const mA = await medirModo(gA);
  357 |   anotar('CP-14', mL.ok14 && mA.ok14, `LINEAL: ${conteo(gL)}; ${mL.d14} | AGRUPADO: ${conteo(gA)}; ${mA.d14}`);
  358 |   anotar('CP-15', conteoOk(gL) && conteoOk(gA) && mL.ok15 && mA.ok15, `LINEAL: ${mL.d15} | AGRUPADO: ${mA.d15}`);
  359 |   anotar('CP-16', mL.ok16 && mA.ok16, `LINEAL: ${mL.d16} | AGRUPADO: ${mA.d16}`);
  360 | 
  361 |   // -- CP-17: expandir los grupos en Agrupada
  362 |   const summary = page.locator('summary', { hasText: /grupos? de eventos cercanos/ });
  363 |   let abierto = '(sin lista de grupos)';
  364 |   let items: Array<{ etiqueta: string; fecha: string }> = [];
  365 |   let listaGrupos: string[] = [];
  366 |   const kA = hA.grupos.findIndex((g) => g.some((m) => clase(m) === 'EVENTO_SANITARIO' && Number(m.id_evento) === EVT_C));
  367 |   if (await summary.count()) {
  368 |     await summary.first().click();
  369 |     const det = page.locator('details', { has: summary.first() });
  370 |     abierto = String(await det.first().evaluate((d) => (d as HTMLDetailsElement).open));
  371 |     const lis = det.first().locator(':scope > ul > li');
  372 |     listaGrupos = (await lis.allTextContents()).map((t) => norm(t).slice(0, 80));
  373 |     if (kA >= 0 && kA < await lis.count()) {
  374 |       items = (await lis.nth(kA).locator(':scope > ul > li').allTextContents()).map((t) => {
  375 |         const s = norm(t); const k = s.indexOf(' · ');
  376 |         return { etiqueta: k >= 0 ? s.slice(0, k) : s, fecha: k >= 0 ? s.slice(k + 3) : '' };
  377 |       });
  378 |     }
  379 |   }
  380 |   const miembros = kA >= 0 ? hA.grupos[kA] : [];
  381 |   const esperado = [...miembros].sort((a, b) => (PRIORIDAD[clase(a)] - PRIORIDAD[clase(b)]) || (ms(a.fecha) - ms(b.fecha))).map(nombreMarcador);
  382 |   const porFecha = new Map(miembros.map((m) => [fechaBogota(m.fecha), nombreMarcador(m)] as const));
  383 |   const identificados = items.map((it) => porFecha.get(it.fecha) ?? `?(${it.fecha})`);
  384 |   anotar('CP-17', kA >= 0 && esperado.length > 1 && JSON.stringify(identificados) === JSON.stringify(esperado),
  385 |     `details_open=${abierto}; grupo ${kA + 1} de ${hA.grupos.length}: [${items.map((it) => `"${it.etiqueta} · ${it.fecha}"`).join(', ')}]; orden_identificado=[${identificados.join(', ')}]; orden_esperado=[${esperado.join(', ')}]`);
  386 | 
  387 |   observaciones.push(`OBS-8 (navegador real): texto al pasar el ratón sobre cada marcador de evento. LINEAL: [${mL.tooltips.join('; ')}]; AGRUPADO: [${mA.tooltips.join('; ')}]`);
  388 |   observaciones.push(`OBS-4 (navegador real, Lineal): en la posición del grupo ${PRED_C}/${EVT_C} siguen dibujados ${puntosEnGrupo} punto(s) de la línea y ${eventosEnGrupo} marcador(es) de evento por separado.`);
  389 |   observaciones.push(`OBS-7 (navegador real, Agrupada): grupos listados=[${listaGrupos.map((t) => `"${t}"`).join(', ')}]; etiquetas del grupo de CP-12=[${items.map((it) => `"${it.etiqueta}"`).join(', ')}]`);
  390 | 
  391 |   // -- Precondicion de despliegue (#693) con los scripts que cargo la app
  392 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  393 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  394 |   await page.goto('about:blank');
  395 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  396 |   precondicion('El frontend desplegado tiene la vista del historial predictivo de #693 ("Se relacionan predicción y evento", "grupos de eventos cercanos")',
  397 |     todo.includes('Se relacionan predicción y evento') && todo.includes('grupos de eventos cercanos'),
  398 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  399 | 
  400 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 401 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-14, CP-16
  402 | });
  403 | 
```