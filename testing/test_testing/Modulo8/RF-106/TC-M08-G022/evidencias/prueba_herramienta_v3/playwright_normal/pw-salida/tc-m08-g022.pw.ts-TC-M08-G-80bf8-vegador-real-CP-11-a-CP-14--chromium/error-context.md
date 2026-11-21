# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g022.pw.ts >> TC-M08-G022 parte navegador real (CP-11 a CP-14)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G022\tc-m08-g022.pw.ts:313:1

# Error details

```
Error: CP-13, CP-14

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  407 |   );
  408 | 
  409 |   await captura(page, 'historial_885');
  410 |   observaciones.push(`Línea base ${ACTIVO}: ${h.predicciones.length} predicciones (${nConRetro} con valoración, ${nSinRetro} sin valoración), ${h.eventos_sanitarios.length} eventos, ${h.retroalimentaciones.length} retroalimentaciones, ${h.pendientes.total} pendientes (niveles=[${[...nivelesPend].sort().join(',')}]).`);
  411 | 
  412 |   // -- Parte B: conflicto simulado con page.route (solo lectura)
  413 |   const hB = JSON.parse(JSON.stringify(h)) as Historial;
  414 |   const ordenadas = [...hB.predicciones].sort((a, b) => ms(a.fecha) - ms(b.fecha));
  415 |   const pA = ordenadas[0];
  416 |   const pB = ordenadas.find((p) => ms(p.fecha) - ms(pA.fecha) >= 10 * DIA_MS);
  417 |   precondicion('Parte B: existen dos predicciones pA y pB con al menos 10 días de diferencia', Boolean(pA && pB),
  418 |     `pA=${pA ? `${corto(pA.id_resultado_inferencia)}@${pA.fecha}` : '(ausente)'}, pB=${pB ? `${corto(pB.id_resultado_inferencia)}@${pB.fecha}` : '(ausente)'}`);
  419 | 
  420 |   const tsA1 = iso(new Date(ms(pA.fecha) + DIA_MS).toISOString());
  421 |   const tsB1 = iso(new Date(ms(pB!.fecha) + DIA_MS).toISOString());
  422 |   const tsB2 = iso(new Date(ms(pB!.fecha) + 3 * DIA_MS).toISOString());
  423 |   const fechasSim = [tsA1, tsB1, tsB2];
  424 |   const colisionPred = fechasSim.some((f) => hB.predicciones.some((p) => Math.abs(ms(f) - ms(p.fecha)) <= HORA_MS));
  425 |   precondicion('Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción', !colisionPred,
  426 |     `fechas=[${fechasSim.join(', ')}]`);
  427 | 
  428 |   const idA = String(pA.id_resultado_inferencia);
  429 |   const idB = String(pB!.id_resultado_inferencia);
  430 |   hB.retroalimentaciones = [
  431 |     { tipo: 'RETROALIMENTACION', fecha: tsA1, id_resultado_inferencia: idA, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: false },
  432 |     { tipo: 'RETROALIMENTACION', fecha: tsB1, id_resultado_inferencia: idB, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: true },
  433 |     { tipo: 'RETROALIMENTACION', fecha: tsB2, id_resultado_inferencia: idB, valoracion: 'INCORRECTO', veterinario: 'QA Vet B', observaciones: null, en_conflicto: true },
  434 |   ];
  435 |   hB.grupos = [];
  436 |   hB.correspondencias = [];
  437 |   hB.eventos_sanitarios = [];
  438 |   for (const p of hB.predicciones) {
  439 |     const id = String(p.id_resultado_inferencia);
  440 |     p.en_conflicto = id === idB;
  441 |     p.tiene_retroalimentacion = id === idA || id === idB;
  442 |   }
  443 |   hB.tvco = calcularTvco(hB.predicciones, hB.retroalimentaciones);
  444 |   hB.metadatos.total_conflictos = 1;
  445 |   hB.metadatos.total_retroalimentaciones = 3;
  446 |   hB.metadatos.total_eventos_sanitarios = 0;
  447 | 
  448 |   let simuladas = 0;
  449 |   const rutaSimulada = new RegExp(`/historial-predictivo/${ACTIVO}\\?`);
  450 |   const manejadorSimulado = (route: Route) => {
  451 |     simuladas += 1;
  452 |     return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hB) });
  453 |   };
  454 |   await page.route(rutaSimulada, manejadorSimulado);
  455 | 
  456 |   const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  457 |   await page.getByRole('radio', { name: 'Agrupada' }).check();
  458 |   await respAgrupado;
  459 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  460 |   await esperarEstable(page);
  461 | 
  462 |   const nRetrosDom = await page.locator('.recharts-scatter-symbol text').count();
  463 |   precondicion('Parte B: respuesta simulada servida (>=1) y 3 marcadores de retroalimentación dibujados', simuladas >= 1 && nRetrosDom === 3,
  464 |     `simuladas=${simuladas}; marcadores_retro=${nRetrosDom}; clase_0=${clase(hB.retroalimentaciones[0])}`);
  465 | 
  466 |   // -- CP-13: tooltip de conflicto en los dos marcadores en conflicto (indices 1 y 2)
  467 |   const centros = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol text')).map((el) => {
  468 |     const r = el.getBoundingClientRect();
  469 |     return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
  470 |   }));
  471 |   const t1 = await tooltipEnRetro(page, 1, centros[1].px, centros[1].py);
  472 |   const t2 = await tooltipEnRetro(page, 2, centros[2].px, centros[2].py);
  473 |   const fA = fechaBogota(tsB1);
  474 |   const fB = fechaBogota(tsB2);
  475 |   const cumpleTooltip = (t: string) => t.includes('QA Vet A') && t.includes('QA Vet B')
  476 |     && (t.includes('Correcta') || t.includes('CORRECTO'))
  477 |     && (t.includes('Incorrecta') || t.includes('INCORRECTO'))
  478 |     && t.includes(fA) && t.includes(fB);
  479 |   const ok13 = cumpleTooltip(t1) || cumpleTooltip(t2);
  480 |   anotar('CP-13', ok13, `marcador[1]="${t1}" | marcador[2]="${t2}" (esperado fechas ${fA} y ${fB})`);
  481 | 
  482 |   // -- CP-14: triangulo amarillo por pixeles en los dos marcadores en conflicto (indices 1 y 2)
  483 |   const m1 = await medirPixelesAmarillos(page, 1);
  484 |   const m2 = await medirPixelesAmarillos(page, 2);
  485 |   const amarillo = (m: { amarillos: number; noBlancos: number }) => m.amarillos >= 10 && m.noBlancos > 0 && m.amarillos / m.noBlancos >= 0.2;
  486 |   const ok14 = amarillo(m1) && ICONOS_CONFLICTO.has(m1.texto) && amarillo(m2) && ICONOS_CONFLICTO.has(m2.texto);
  487 |   anotar(
  488 |     'CP-14',
  489 |     ok14,
  490 |     `marcador[1]={texto="${m1.texto}", fill="${m1.fill}", amarillos=${m1.amarillos}, no_blancos=${m1.noBlancos}} | marcador[2]={texto="${m2.texto}", fill="${m2.fill}", amarillos=${m2.amarillos}, no_blancos=${m2.noBlancos}}`,
  491 |   );
  492 | 
  493 |   await captura(page, 'conflicto_simulado');
  494 |   await page.unroute(rutaSimulada, manejadorSimulado);
  495 |   observaciones.push(`Parte B: GET simulados=${simuladas}`);
  496 | 
  497 |   // -- Precondicion de despliegue con los scripts que cargo la app
  498 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  499 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  500 |   await page.goto('about:blank');
  501 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  502 |   precondicion('El frontend desplegado contiene "Predicciones sin evaluar (más de 48 horas)" y "Registrar retroalimentación"',
  503 |     todo.includes('Predicciones sin evaluar (más de 48 horas)') && todo.includes('Registrar retroalimentación'),
  504 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  505 | 
  506 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 507 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-13, CP-14
  508 | });
  509 | 
```