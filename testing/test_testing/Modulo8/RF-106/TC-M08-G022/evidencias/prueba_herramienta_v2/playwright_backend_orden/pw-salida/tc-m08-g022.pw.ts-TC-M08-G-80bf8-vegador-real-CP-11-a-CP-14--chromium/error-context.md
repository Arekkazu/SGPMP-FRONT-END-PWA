# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g022.pw.ts >> TC-M08-G022 parte navegador real (CP-11 a CP-14)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G022\tc-m08-g022.pw.ts:304:1

# Error details

```
Error: CP-12, CP-13, CP-14

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  397 |     `calculados(${pendCalc.length})=[${idsCalc.join(', ')}] | backend(total=${h.pendientes.total})=[${idsBack.join(', ')}] | dom(count=${lisDom.length}, domOk=${domOk})=[${lisDom.map((l) => `"${l.texto.slice(0, 70)}"`).join(', ')}]`,
  398 |   );
  399 | 
  400 |   await captura(page, 'historial_885');
  401 |   observaciones.push(`Línea base ${ACTIVO}: ${h.predicciones.length} predicciones (${nConRetro} con valoración, ${nSinRetro} sin valoración), ${h.eventos_sanitarios.length} eventos, ${h.retroalimentaciones.length} retroalimentaciones, ${h.pendientes.total} pendientes (niveles=[${[...nivelesPend].sort().join(',')}]).`);
  402 | 
  403 |   // -- Parte B: conflicto simulado con page.route (solo lectura)
  404 |   const hB = JSON.parse(JSON.stringify(h)) as Historial;
  405 |   const ordenadas = [...hB.predicciones].sort((a, b) => ms(a.fecha) - ms(b.fecha));
  406 |   const pA = ordenadas[0];
  407 |   const pB = ordenadas.find((p) => ms(p.fecha) - ms(pA.fecha) >= 10 * DIA_MS);
  408 |   precondicion('Parte B: existen dos predicciones pA y pB con al menos 10 días de diferencia', Boolean(pA && pB),
  409 |     `pA=${pA ? `${corto(pA.id_resultado_inferencia)}@${pA.fecha}` : '(ausente)'}, pB=${pB ? `${corto(pB.id_resultado_inferencia)}@${pB.fecha}` : '(ausente)'}`);
  410 | 
  411 |   const tsA1 = iso(new Date(ms(pA.fecha) + DIA_MS).toISOString());
  412 |   const tsB1 = iso(new Date(ms(pB!.fecha) + DIA_MS).toISOString());
  413 |   const tsB2 = iso(new Date(ms(pB!.fecha) + 3 * DIA_MS).toISOString());
  414 |   const fechasSim = [tsA1, tsB1, tsB2];
  415 |   const colisionPred = fechasSim.some((f) => hB.predicciones.some((p) => Math.abs(ms(f) - ms(p.fecha)) <= HORA_MS));
  416 |   precondicion('Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción', !colisionPred,
  417 |     `fechas=[${fechasSim.join(', ')}]`);
  418 | 
  419 |   const idA = String(pA.id_resultado_inferencia);
  420 |   const idB = String(pB!.id_resultado_inferencia);
  421 |   hB.retroalimentaciones = [
  422 |     { tipo: 'RETROALIMENTACION', fecha: tsA1, id_resultado_inferencia: idA, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: false },
  423 |     { tipo: 'RETROALIMENTACION', fecha: tsB1, id_resultado_inferencia: idB, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: true },
  424 |     { tipo: 'RETROALIMENTACION', fecha: tsB2, id_resultado_inferencia: idB, valoracion: 'INCORRECTO', veterinario: 'QA Vet B', observaciones: null, en_conflicto: true },
  425 |   ];
  426 |   hB.grupos = [];
  427 |   hB.correspondencias = [];
  428 |   hB.eventos_sanitarios = [];
  429 |   for (const p of hB.predicciones) {
  430 |     const id = String(p.id_resultado_inferencia);
  431 |     p.en_conflicto = id === idB;
  432 |     p.tiene_retroalimentacion = id === idA || id === idB;
  433 |   }
  434 |   hB.tvco = calcularTvco(hB.predicciones, hB.retroalimentaciones);
  435 |   hB.metadatos.total_conflictos = 1;
  436 |   hB.metadatos.total_retroalimentaciones = 3;
  437 |   hB.metadatos.total_eventos_sanitarios = 0;
  438 | 
  439 |   let simuladas = 0;
  440 |   const rutaSimulada = new RegExp(`/historial-predictivo/${ACTIVO}\\?`);
  441 |   const manejadorSimulado = (route: Route) => {
  442 |     simuladas += 1;
  443 |     return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hB) });
  444 |   };
  445 |   await page.route(rutaSimulada, manejadorSimulado);
  446 | 
  447 |   const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  448 |   await page.getByRole('radio', { name: 'Agrupada' }).check();
  449 |   await respAgrupado;
  450 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  451 |   await esperarEstable(page);
  452 | 
  453 |   const nRetrosDom = await page.locator('.recharts-scatter-symbol text').count();
  454 |   precondicion('Parte B: respuesta simulada servida (>=1) y 3 marcadores de retroalimentación dibujados', simuladas >= 1 && nRetrosDom === 3,
  455 |     `simuladas=${simuladas}; marcadores_retro=${nRetrosDom}; clase_0=${clase(hB.retroalimentaciones[0])}`);
  456 | 
  457 |   // -- CP-13: tooltip de conflicto en los dos marcadores en conflicto (indices 1 y 2)
  458 |   const centros = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol text')).map((el) => {
  459 |     const r = el.getBoundingClientRect();
  460 |     return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
  461 |   }));
  462 |   const t1 = await tooltipEnRetro(page, 1, centros[1].px, centros[1].py);
  463 |   const t2 = await tooltipEnRetro(page, 2, centros[2].px, centros[2].py);
  464 |   const fA = fechaBogota(tsB1);
  465 |   const fB = fechaBogota(tsB2);
  466 |   const cumpleTooltip = (t: string) => t.includes('QA Vet A') && t.includes('QA Vet B')
  467 |     && (t.includes('Correcta') || t.includes('CORRECTO'))
  468 |     && (t.includes('Incorrecta') || t.includes('INCORRECTO'))
  469 |     && t.includes(fA) && t.includes(fB);
  470 |   const ok13 = cumpleTooltip(t1) || cumpleTooltip(t2);
  471 |   anotar('CP-13', ok13, `marcador[1]="${t1}" | marcador[2]="${t2}" (esperado fechas ${fA} y ${fB})`);
  472 | 
  473 |   // -- CP-14: triangulo amarillo por pixeles en los dos marcadores en conflicto (indices 1 y 2)
  474 |   const m1 = await medirPixelesAmarillos(page, 1);
  475 |   const m2 = await medirPixelesAmarillos(page, 2);
  476 |   const ok14 = m1.amarillos >= 10 && ICONOS_CONFLICTO.has(m1.texto) && m2.amarillos >= 10 && ICONOS_CONFLICTO.has(m2.texto);
  477 |   anotar(
  478 |     'CP-14',
  479 |     ok14,
  480 |     `marcador[1]={texto="${m1.texto}", fill="${m1.fill}", amarillos=${m1.amarillos}, no_blancos=${m1.noBlancos}} | marcador[2]={texto="${m2.texto}", fill="${m2.fill}", amarillos=${m2.amarillos}, no_blancos=${m2.noBlancos}}`,
  481 |   );
  482 | 
  483 |   await captura(page, 'conflicto_simulado');
  484 |   await page.unroute(rutaSimulada, manejadorSimulado);
  485 |   observaciones.push(`Parte B: GET simulados=${simuladas}`);
  486 | 
  487 |   // -- Precondicion de despliegue con los scripts que cargo la app
  488 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  489 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  490 |   await page.goto('about:blank');
  491 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  492 |   precondicion('El frontend desplegado contiene "Predicciones sin evaluar (más de 48 horas)" y "Registrar retroalimentación"',
  493 |     todo.includes('Predicciones sin evaluar (más de 48 horas)') && todo.includes('Registrar retroalimentación'),
  494 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  495 | 
  496 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 497 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-12, CP-13, CP-14
  498 | });
  499 | 
```