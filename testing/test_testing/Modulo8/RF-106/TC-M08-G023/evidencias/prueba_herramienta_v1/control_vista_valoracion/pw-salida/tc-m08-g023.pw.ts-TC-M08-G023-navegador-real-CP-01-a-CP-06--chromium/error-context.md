# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g023.pw.ts >> TC-M08-G023 navegador real (CP-01 a CP-06)
- Location: testing\test_testing\Modulo8\RF-106\TC-M08-G023\tc-m08-g023.pw.ts:296:1

# Error details

```
Error: CP-02, CP-05

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  499 |     );
  500 |     const uPost = new URL(page.url());
  501 |     observaciones.push(`Ruta tras el registro en RF-72: ${uPost.pathname}${uPost.search}.`);
  502 |   }
  503 | 
  504 |   // -- 6. Vuelta al historial y CP-06
  505 |   const getsHistAntesVuelta = peticiones.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta)).length;
  506 |   await page.goBack();
  507 |   await page.waitForURL((u) => u.pathname.endsWith('/prediccion/historial-predictivo'), { timeout: 15_000 }).catch(() => undefined);
  508 |   await page.waitForTimeout(3_000);
  509 |   const valorComboAlVolver = await page.getByRole('combobox', { name: 'Animal o lote' }).inputValue().catch(() => '(no disponible)');
  510 |   const getsAutoAlVolver = peticiones.filter((p) => p.metodo === 'GET' && /\/historial-predictivo\//.test(p.ruta)).length - getsHistAntesVuelta;
  511 |   observaciones.push(`Al volver con atrás: combobox "Animal o lote"="${valorComboAlVolver}", GET /historial-predictivo sin volver a elegir=${getsAutoAlVolver}.`);
  512 | 
  513 |   const r2 = await elegirActivo(page, opcion!.etiqueta);
  514 |   await esperarEstable(page);
  515 |   const h2 = (await r2.json()) as Historial;
  516 | 
  517 |   const getsHistDespuesVuelta = peticiones.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta)).length;
  518 |   const tvcoCardLoc = page.locator('xpath=//div[normalize-space(.)="Tasa de validación clínica"]/following-sibling::div[1]');
  519 |   const tvcoPantalla2 = (await tvcoCardLoc.count()) ? norm(await tvcoCardLoc.first().textContent()) : '(sin TVCO)';
  520 |   const lisDom2 = await page.evaluate(() => {
  521 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  522 |     const h3 = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Predicciones sin evaluar (más de 48 horas)');
  523 |     const cont = h3?.parentElement;
  524 |     if (!cont) return [] as Array<{ texto: string; botones: string[] }>;
  525 |     return Array.from(cont.querySelectorAll('ul > li')).map((li) => ({
  526 |       texto: n(li.textContent),
  527 |       botones: Array.from(li.querySelectorAll('button')).map((b) => n(b.textContent)),
  528 |     }));
  529 |   });
  530 |   const domOk2 = lisDom2.length === h2.pendientes.items.length && h2.pendientes.items.every((it, i) => {
  531 |     const fecha = fechaBogota(it.fecha_inferencia);
  532 |     const nivel = NIVEL_LABEL[Number(it.nivel_riesgo ?? 0)] ?? '';
  533 |     return lisDom2[i].texto.includes(fecha) && lisDom2[i].texto.includes(nivel) && lisDom2[i].botones.includes('Registrar retroalimentación');
  534 |   });
  535 |   const idAltoSigue = h2.pendientes.items.some((p) => p.id_resultado_inferencia === itemAlto!.id_resultado_inferencia);
  536 |   const ok06 = getsHistDespuesVuelta > getsHistAntesVuelta && r2.status() === 200 && tvcoPantalla2 === h2.tvco.texto && domOk2;
  537 |   anotar(
  538 |     'CP-06',
  539 |     ok06,
  540 |     `HTTP=${r2.status()}, x-request-id="${r2.headers()['x-request-id'] ?? ''}", respuesta_tvco="${h2.tvco.texto}", pantalla_tvco="${tvcoPantalla2}", li=${lisDom2.length}/${h2.pendientes.items.length} (domOk=${domOk2}), id_CP01_sigue_en_pendientes=${idAltoSigue}`,
  541 |   );
  542 |   observaciones.push(`Al volver al historial, el id de CP-01 (${corto(itemAlto!.id_resultado_inferencia)}) ${idAltoSigue ? 'sigue' : 'no sigue'} en pendientes (con POST simulado se espera que siga).`);
  543 | 
  544 |   // -- 7. CP-02: pendiente de nivel <= 1
  545 |   const idxBajo2 = h2.pendientes.items.findIndex((p) => p.id_resultado_inferencia === itemBajo!.id_resultado_inferencia);
  546 |   precondicion(
  547 |     'El pendiente de nivel <= 1 de la línea base sigue en la lista',
  548 |     idxBajo2 >= 0,
  549 |     idxBajo2 >= 0 ? `indice=${idxBajo2}, id=${corto(itemBajo!.id_resultado_inferencia)}` : `id=${corto(itemBajo!.id_resultado_inferencia)} ausente`,
  550 |   );
  551 |   const res02 = await probarClicPendiente(idxBajo2, itemBajo!, 'CP-02_rf72');
  552 |   anotar('CP-02', res02.ok, res02.obtenido);
  553 | 
  554 |   // -- 8. CP-04: fuentes que consulta la vista
  555 |   const enHistorial = peticiones.filter((p) => p.pantalla.endsWith('/prediccion/historial-predictivo'));
  556 |   const getsHist = enHistorial.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta));
  557 |   const infsHist = enHistorial.filter((p) => p.ruta.includes('/prediccion/inferencias'));
  558 |   const infsOtras = peticiones.filter((p) => !p.pantalla.endsWith('/prediccion/historial-predictivo') && p.ruta.includes('/prediccion/inferencias'));
  559 |   const ok04 = getsHist.length >= 2 && getsHist.every((p) => p.status === 200) && infsHist.length === 0;
  560 |   anotar(
  561 |     'CP-04',
  562 |     ok04,
  563 |     `GET /historial-predictivo/${ACTIVO}=${getsHist.length} (status=[${getsHist.map((p) => p.status ?? 'sin_resp').join(', ')}]); /prediccion/inferencias en historial=${infsHist.length}${infsHist.length ? ` [${infsHist.map((p) => `${p.metodo} ${p.ruta}`).join(', ')}]` : ''}`,
  564 |   );
  565 |   observaciones.push(`Peticiones a /prediccion/inferencias en otras pantallas: ${infsOtras.length}. Respuestas clave registradas: ${respuestasClave.length}.`);
  566 | 
  567 |   // -- 9. CP-05: la vista es de solo lectura
  568 |   const noGetHistorial = enHistorial.filter(esNoGetApi);
  569 |   const ok05 = estatica.dialogs === 0
  570 |     && estatica.radiogroups === 0
  571 |     && estatica.textareas === 0
  572 |     && estatica.botonesValoracion.length === 0
  573 |     && botonesPendNoPermitidos.length === 0
  574 |     && noGetHistorial.length === 0
  575 |     && res01.noGetEnClic.length === 0
  576 |     && res02.noGetEnClic.length === 0;
  577 |   anotar(
  578 |     'CP-05',
  579 |     ok05,
  580 |     `dialogs=${estatica.dialogs}, radiogroups=${estatica.radiogroups}, textareas=${estatica.textareas}, botones_valoracion=${estatica.botonesValoracion.length} [${estatica.botonesValoracion.join(', ')}], botones_pend=[${estatica.botonesPend.join(', ')}], no_get_historial=${noGetHistorial.length}, no_get_clic_cp01=${res01.noGetEnClic.length}, no_get_clic_cp02=${res02.noGetEnClic.length}`,
  581 |   );
  582 | 
  583 |   // -- 10. Precondicion de despliegue con los scripts que cargo la app
  584 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  585 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  586 |   await page.goto('about:blank');
  587 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  588 |   precondicion(
  589 |     'El frontend desplegado contiene los textos y ruta de RF-106 / RF-72',
  590 |     todo.includes('Registrar retroalimentación')
  591 |       && todo.includes('Predicciones sin evaluar (más de 48 horas)')
  592 |       && todo.includes('Registrar evaluación')
  593 |       && todo.includes('/prediccion/retroalimentacion?resultado='),
  594 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`,
  595 |   );
  596 | 
  597 |   // -- 11. Verificacion final
  598 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 599 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-02, CP-05
  600 | });
  601 | 
```