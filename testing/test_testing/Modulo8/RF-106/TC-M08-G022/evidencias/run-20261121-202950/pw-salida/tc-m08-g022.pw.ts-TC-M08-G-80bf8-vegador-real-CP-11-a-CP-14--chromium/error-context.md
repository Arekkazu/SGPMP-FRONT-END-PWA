# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g022.pw.ts >> TC-M08-G022 parte navegador real (CP-11 a CP-14)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G022\tc-m08-g022.pw.ts:331:1

# Error details

```
Error: CP-12

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  436 |     `pA=${pA ? `${corto(pA.id_resultado_inferencia)}@${pA.fecha}` : '(ausente)'}, pB=${pB ? `${corto(pB.id_resultado_inferencia)}@${pB.fecha}` : '(ausente)'}`);
  437 | 
  438 |   const libre = (desde: number, usadas: number[]): number => {
  439 |     for (let k = 0; k < 96; k += 1) {
  440 |       const t = desde + (6 + k) * HORA_MS;
  441 |       if (!hB.predicciones.some((p) => Math.abs(t - ms(p.fecha)) <= HORA_MS) && !usadas.some((u) => Math.abs(t - u) <= HORA_MS)) return t;
  442 |     }
  443 |     return desde + DIA_MS;
  444 |   };
  445 |   const tA1 = libre(ms(pA.fecha), []);
  446 |   const tB1 = libre(ms(pB!.fecha), [tA1]);
  447 |   const tB2 = libre(tB1 + 2 * DIA_MS, [tA1, tB1]);
  448 |   const tsA1 = iso(new Date(tA1).toISOString());
  449 |   const tsB1 = iso(new Date(tB1).toISOString());
  450 |   const tsB2 = iso(new Date(tB2).toISOString());
  451 |   const fechasSim = [tsA1, tsB1, tsB2];
  452 |   const colisionPred = fechasSim.some((f) => hB.predicciones.some((p) => Math.abs(ms(f) - ms(p.fecha)) <= HORA_MS));
  453 |   precondicion('Parte B: ninguna de las 3 fechas simuladas queda a menos de 1 h de una predicción', !colisionPred,
  454 |     `fechas=[${fechasSim.join(', ')}]`);
  455 | 
  456 |   const idA = String(pA.id_resultado_inferencia);
  457 |   const idB = String(pB!.id_resultado_inferencia);
  458 |   hB.retroalimentaciones = [
  459 |     { tipo: 'RETROALIMENTACION', fecha: tsA1, id_resultado_inferencia: idA, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: false },
  460 |     { tipo: 'RETROALIMENTACION', fecha: tsB1, id_resultado_inferencia: idB, valoracion: 'CORRECTO', veterinario: 'QA Vet A', observaciones: null, en_conflicto: true },
  461 |     { tipo: 'RETROALIMENTACION', fecha: tsB2, id_resultado_inferencia: idB, valoracion: 'INCORRECTO', veterinario: 'QA Vet B', observaciones: null, en_conflicto: true },
  462 |   ];
  463 |   hB.grupos = [];
  464 |   hB.correspondencias = [];
  465 |   hB.eventos_sanitarios = [];
  466 |   for (const p of hB.predicciones) {
  467 |     const id = String(p.id_resultado_inferencia);
  468 |     p.en_conflicto = id === idB;
  469 |     p.tiene_retroalimentacion = id === idA || id === idB;
  470 |   }
  471 |   hB.tvco = calcularTvco(hB.predicciones, hB.retroalimentaciones);
  472 |   hB.metadatos.total_conflictos = 1;
  473 |   hB.metadatos.total_retroalimentaciones = 3;
  474 |   hB.metadatos.total_eventos_sanitarios = 0;
  475 | 
  476 |   let simuladas = 0;
  477 |   const rutaSimulada = new RegExp(`/historial-predictivo/${ACTIVO}\\?`);
  478 |   const manejadorSimulado = (route: Route) => {
  479 |     simuladas += 1;
  480 |     return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hB) });
  481 |   };
  482 |   await page.route(rutaSimulada, manejadorSimulado);
  483 | 
  484 |   const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  485 |   await page.getByRole('radio', { name: 'Agrupada' }).check();
  486 |   await respAgrupado;
  487 |   await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  488 |   await esperarEstable(page);
  489 | 
  490 |   const nRetrosDom = await page.locator('.recharts-scatter-symbol text:not(.hp-grupo)').count(); // ADAPT-1
  491 |   precondicion('Parte B: respuesta simulada servida (>=1) y 3 marcadores de retroalimentación dibujados', simuladas >= 1 && nRetrosDom === 3,
  492 |     `simuladas=${simuladas}; marcadores_retro=${nRetrosDom}; clase_0=${clase(hB.retroalimentaciones[0])}`);
  493 | 
  494 |   // -- CP-13: tooltip de conflicto en los dos marcadores en conflicto (indices 1 y 2)
  495 |   const centros = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol text:not(.hp-grupo)')).map((el) => { // ADAPT-1
  496 |     const r = el.getBoundingClientRect();
  497 |     return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
  498 |   }));
  499 |   const t1 = await tooltipEnRetro(page, 1, centros[1].px, centros[1].py);
  500 |   const t2 = await tooltipEnRetro(page, 2, centros[2].px, centros[2].py);
  501 |   const fA = fechaBogota(tsB1);
  502 |   const fB = fechaBogota(tsB2);
  503 |   const cumpleTooltip = (t: string) => t.includes('QA Vet A') && t.includes('QA Vet B')
  504 |     && (t.includes('Correcta') || t.includes('CORRECTO'))
  505 |     && (t.includes('Incorrecta') || t.includes('INCORRECTO'))
  506 |     && t.includes(fA) && t.includes(fB);
  507 |   const ok13 = cumpleTooltip(t1) || cumpleTooltip(t2);
  508 |   anotar('CP-13', ok13, `marcador[1]="${t1}" | marcador[2]="${t2}" (esperado fechas ${fA} y ${fB})`);
  509 | 
  510 |   // -- CP-14: triangulo amarillo por pixeles en los dos marcadores en conflicto (indices 1 y 2)
  511 |   const m1 = await medirPixelesAmarillos(page, 1);
  512 |   const m2 = await medirPixelesAmarillos(page, 2);
  513 |   // ADAPT-2: la proporcion se toma sobre los pixeles distintos del fondo real (en tema oscuro todo el recorte es "no blanco").
  514 |   const amarillo = (m: { amarillos: number; noFondo: number }) => m.amarillos >= 10 && m.noFondo > 0 && m.amarillos / m.noFondo >= 0.2;
  515 |   const ok14 = amarillo(m1) && ICONOS_CONFLICTO.has(m1.texto) && amarillo(m2) && ICONOS_CONFLICTO.has(m2.texto);
  516 |   anotar(
  517 |     'CP-14',
  518 |     ok14,
  519 |     `tema=${m1.tema}; marcador[1]={texto="${m1.texto}", fill="${m1.fill}", fondo="${m1.fondo}", amarillos=${m1.amarillos}, distintos_del_fondo=${m1.noFondo}, no_blancos=${m1.noBlancos}} | marcador[2]={texto="${m2.texto}", fill="${m2.fill}", fondo="${m2.fondo}", amarillos=${m2.amarillos}, distintos_del_fondo=${m2.noFondo}, no_blancos=${m2.noBlancos}}`,
  520 |   );
  521 | 
  522 |   await captura(page, 'conflicto_simulado');
  523 |   await page.unroute(rutaSimulada, manejadorSimulado);
  524 |   observaciones.push(`Parte B: GET simulados=${simuladas}`);
  525 | 
  526 |   // -- Precondicion de despliegue con los scripts que cargo la app
  527 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  528 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  529 |   await page.goto('about:blank');
  530 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  531 |   precondicion('El frontend desplegado contiene "Predicciones sin evaluar (más de 48 horas)" y "Registrar retroalimentación"',
  532 |     todo.includes('Predicciones sin evaluar (más de 48 horas)') && todo.includes('Registrar retroalimentación'),
  533 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  534 | 
  535 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 536 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-12
  537 | });
  538 | 
```