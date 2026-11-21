# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g022.pw.ts >> TC-M08-G022 parte navegador real (CP-11 a CP-14)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G022\tc-m08-g022.pw.ts:314:1

# Error details

```
Error: CP-13, CP-14

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  418 |   precondicion('Parte B: existen dos predicciones pA y pB con al menos 10 días de diferencia', Boolean(pA && pB),
  419 |     `pA=${pA ? `${corto(pA.id_resultado_inferencia)}@${pA.fecha}` : '(ausente)'}, pB=${pB ? `${corto(pB.id_resultado_inferencia)}@${pB.fecha}` : '(ausente)'}`);
  420 | 
  421 |   const libre = (desde: number, usadas: number[]): number => {
  422 |     for (let k = 0; k < 96; k += 1) {
  423 |       const t = desde + (6 + k) * HORA_MS;
  424 |       if (!hB.predicciones.some((p) => Math.abs(t - ms(p.fecha)) <= HORA_MS) && !usadas.some((u) => Math.abs(t - u) <= HORA_MS)) return t;
  425 |     }
  426 |     return desde + DIA_MS;
  427 |   };
  428 |   const tA1 = libre(ms(pA.fecha), []);
  429 |   const tB1 = libre(ms(pB!.fecha), [tA1]);
  430 |   const tB2 = libre(tB1 + 2 * DIA_MS, [tA1, tB1]);
  431 |   const tsA1 = iso(new Date(tA1).toISOString());
  432 |   const tsB1 = iso(new Date(tB1).toISOString());
  433 |   const tsB2 = iso(new Date(tB2).toISOString());
  434 |   const fechasSim = [tsA1, tsB1, tsB2];
  435 |   const colisionPred = fechasSim.some((f) => hB.predicciones.some((p) => Math.abs(ms(f) - ms(p.fecha)) <= HORA_MS));
  436 |   precondicion('Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción', !colisionPred,
  437 |     `fechas=[${fechasSim.join(', ')}]`);
  438 | 
  439 |   const idA = String(pA.id_resultado_inferencia);
  440 |   const idB = String(pB!.id_resultado_inferencia);
  441 |   hB.retroalimentaciones = [
  442 |     { tipo: 'RETROALIMENTACION', fecha: tsA1, id_resultado_inferencia: idA, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: false },
  443 |     { tipo: 'RETROALIMENTACION', fecha: tsB1, id_resultado_inferencia: idB, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: true },
  444 |     { tipo: 'RETROALIMENTACION', fecha: tsB2, id_resultado_inferencia: idB, valoracion: 'INCORRECTO', veterinario: 'QA Vet B', observaciones: null, en_conflicto: true },
  445 |   ];
  446 |   hB.grupos = [];
  447 |   hB.correspondencias = [];
  448 |   hB.eventos_sanitarios = [];
  449 |   for (const p of hB.predicciones) {
  450 |     const id = String(p.id_resultado_inferencia);
  451 |     p.en_conflicto = id === idB;
  452 |     p.tiene_retroalimentacion = id === idA || id === idB;
  453 |   }
  454 |   hB.tvco = calcularTvco(hB.predicciones, hB.retroalimentaciones);
  455 |   hB.metadatos.total_conflictos = 1;
  456 |   hB.metadatos.total_retroalimentaciones = 3;
  457 |   hB.metadatos.total_eventos_sanitarios = 0;
  458 | 
  459 |   let simuladas = 0;
  460 |   const rutaSimulada = new RegExp(`/historial-predictivo/${ACTIVO}\\?`);
  461 |   const manejadorSimulado = (route: Route) => {
  462 |     simuladas += 1;
  463 |     return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hB) });
  464 |   };
  465 |   await page.route(rutaSimulada, manejadorSimulado);
  466 | 
  467 |   const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  468 |   await page.getByRole('radio', { name: 'Agrupada' }).check();
  469 |   await respAgrupado;
  470 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  471 |   await esperarEstable(page);
  472 | 
  473 |   const nRetrosDom = await page.locator('.recharts-scatter-symbol text').count();
  474 |   precondicion('Parte B: respuesta simulada servida (>=1) y 3 marcadores de retroalimentación dibujados', simuladas >= 1 && nRetrosDom === 3,
  475 |     `simuladas=${simuladas}; marcadores_retro=${nRetrosDom}; clase_0=${clase(hB.retroalimentaciones[0])}`);
  476 | 
  477 |   // -- CP-13: tooltip de conflicto en los dos marcadores en conflicto (indices 1 y 2)
  478 |   const centros = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol text')).map((el) => {
  479 |     const r = el.getBoundingClientRect();
  480 |     return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
  481 |   }));
  482 |   const t1 = await tooltipEnRetro(page, 1, centros[1].px, centros[1].py);
  483 |   const t2 = await tooltipEnRetro(page, 2, centros[2].px, centros[2].py);
  484 |   const fA = fechaBogota(tsB1);
  485 |   const fB = fechaBogota(tsB2);
  486 |   const cumpleTooltip = (t: string) => t.includes('QA Vet A') && t.includes('QA Vet B')
  487 |     && (t.includes('Correcta') || t.includes('CORRECTO'))
  488 |     && (t.includes('Incorrecta') || t.includes('INCORRECTO'))
  489 |     && t.includes(fA) && t.includes(fB);
  490 |   const ok13 = cumpleTooltip(t1) || cumpleTooltip(t2);
  491 |   anotar('CP-13', ok13, `marcador[1]="${t1}" | marcador[2]="${t2}" (esperado fechas ${fA} y ${fB})`);
  492 | 
  493 |   // -- CP-14: triangulo amarillo por pixeles en los dos marcadores en conflicto (indices 1 y 2)
  494 |   const m1 = await medirPixelesAmarillos(page, 1);
  495 |   const m2 = await medirPixelesAmarillos(page, 2);
  496 |   const amarillo = (m: { amarillos: number; noBlancos: number }) => m.amarillos >= 10 && m.noBlancos > 0 && m.amarillos / m.noBlancos >= 0.2;
  497 |   const ok14 = amarillo(m1) && ICONOS_CONFLICTO.has(m1.texto) && amarillo(m2) && ICONOS_CONFLICTO.has(m2.texto);
  498 |   anotar(
  499 |     'CP-14',
  500 |     ok14,
  501 |     `marcador[1]={texto="${m1.texto}", fill="${m1.fill}", amarillos=${m1.amarillos}, no_blancos=${m1.noBlancos}} | marcador[2]={texto="${m2.texto}", fill="${m2.fill}", amarillos=${m2.amarillos}, no_blancos=${m2.noBlancos}}`,
  502 |   );
  503 | 
  504 |   await captura(page, 'conflicto_simulado');
  505 |   await page.unroute(rutaSimulada, manejadorSimulado);
  506 |   observaciones.push(`Parte B: GET simulados=${simuladas}`);
  507 | 
  508 |   // -- Precondicion de despliegue con los scripts que cargo la app
  509 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  510 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  511 |   await page.goto('about:blank');
  512 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  513 |   precondicion('El frontend desplegado contiene "Predicciones sin evaluar (más de 48 horas)" y "Registrar retroalimentación"',
  514 |     todo.includes('Predicciones sin evaluar (más de 48 horas)') && todo.includes('Registrar retroalimentación'),
  515 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  516 | 
  517 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 518 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-13, CP-14
  519 | });
  520 | 
```