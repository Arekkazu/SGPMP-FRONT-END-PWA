# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control_sin_simulacion.pw.ts >> TC-M08-G023 navegador real (CP-01 a CP-06)
- Location: ..\..\.gemini\antigravity\brain\ae34bc1d-8cba-4e7c-8a4f-648b731eabc8\scratch\qa_g023_guardia\control_sin_simulacion.pw.ts:296:1

# Error details

```
Error: POST /sigab-test/api/prediccion/retroalimentacion

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "POST /sigab-test/api/prediccion/retroalimentacion",
+ ]
```

# Test source

```ts
  497 |       `posts=${nPosts}, body=${b0 ? `{id_resultado_inferencia="${b0.id_resultado_inferencia}", id_activo_biologico=${b0.id_activo_biologico}, estado_retroalimentacion="${b0.estado_retroalimentacion}"}` : 'null'}, dialogo_cerrado=${dialogoCerrado}, aviso=${avisoVisible}`,
  498 |     );
  499 |     const uPost = new URL(page.url());
  500 |     observaciones.push(`Ruta tras el registro en RF-72: ${uPost.pathname}${uPost.search}.`);
  501 |   }
  502 | 
  503 |   // -- 6. Vuelta al historial y CP-06
  504 |   const getsHistAntesVuelta = peticiones.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta)).length;
  505 |   await page.goBack();
  506 |   await page.waitForURL((u) => u.pathname.endsWith('/prediccion/historial-predictivo'), { timeout: 15_000 }).catch(() => undefined);
  507 |   await page.waitForTimeout(3_000);
  508 |   const valorComboAlVolver = await page.getByRole('combobox', { name: 'Animal o lote' }).inputValue().catch(() => '(no disponible)');
  509 |   const getsAutoAlVolver = peticiones.filter((p) => p.metodo === 'GET' && /\/historial-predictivo\//.test(p.ruta)).length - getsHistAntesVuelta;
  510 |   observaciones.push(`Al volver con atrás: combobox "Animal o lote"="${valorComboAlVolver}", GET /historial-predictivo sin volver a elegir=${getsAutoAlVolver}.`);
  511 | 
  512 |   const r2 = await elegirActivo(page, opcion!.etiqueta);
  513 |   await esperarEstable(page);
  514 |   const h2 = (await r2.json()) as Historial;
  515 | 
  516 |   const getsHistDespuesVuelta = peticiones.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta)).length;
  517 |   const tvcoCardLoc = page.locator('xpath=//div[normalize-space(.)="Tasa de validación clínica"]/following-sibling::div[1]');
  518 |   const tvcoPantalla2 = (await tvcoCardLoc.count()) ? norm(await tvcoCardLoc.first().textContent()) : '(sin TVCO)';
  519 |   const lisDom2 = await page.evaluate(() => {
  520 |     const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  521 |     const h3 = Array.from(document.querySelectorAll('h3')).find((el) => n(el.textContent) === 'Predicciones sin evaluar (más de 48 horas)');
  522 |     const cont = h3?.parentElement;
  523 |     if (!cont) return [] as Array<{ texto: string; botones: string[] }>;
  524 |     return Array.from(cont.querySelectorAll('ul > li')).map((li) => ({
  525 |       texto: n(li.textContent),
  526 |       botones: Array.from(li.querySelectorAll('button')).map((b) => n(b.textContent)),
  527 |     }));
  528 |   });
  529 |   const domOk2 = lisDom2.length === h2.pendientes.items.length && h2.pendientes.items.every((it, i) => {
  530 |     const fecha = fechaBogota(it.fecha_inferencia);
  531 |     const nivel = NIVEL_LABEL[Number(it.nivel_riesgo ?? 0)] ?? '';
  532 |     return lisDom2[i].texto.includes(fecha) && lisDom2[i].texto.includes(nivel) && lisDom2[i].botones.includes('Registrar retroalimentación');
  533 |   });
  534 |   const idAltoSigue = h2.pendientes.items.some((p) => p.id_resultado_inferencia === itemAlto!.id_resultado_inferencia);
  535 |   const ok06 = getsHistDespuesVuelta > getsHistAntesVuelta && r2.status() === 200 && tvcoPantalla2 === h2.tvco.texto && domOk2;
  536 |   anotar(
  537 |     'CP-06',
  538 |     ok06,
  539 |     `HTTP=${r2.status()}, x-request-id="${r2.headers()['x-request-id'] ?? ''}", respuesta_tvco="${h2.tvco.texto}", pantalla_tvco="${tvcoPantalla2}", li=${lisDom2.length}/${h2.pendientes.items.length} (domOk=${domOk2}), id_CP01_sigue_en_pendientes=${idAltoSigue}`,
  540 |   );
  541 |   observaciones.push(`Al volver al historial, el id de CP-01 (${corto(itemAlto!.id_resultado_inferencia)}) ${idAltoSigue ? 'sigue' : 'no sigue'} en pendientes (con POST simulado se espera que siga).`);
  542 | 
  543 |   // -- 7. CP-02: pendiente de nivel <= 1
  544 |   const idxBajo2 = h2.pendientes.items.findIndex((p) => p.id_resultado_inferencia === itemBajo!.id_resultado_inferencia);
  545 |   precondicion(
  546 |     'El pendiente de nivel <= 1 de la línea base sigue en la lista',
  547 |     idxBajo2 >= 0,
  548 |     idxBajo2 >= 0 ? `indice=${idxBajo2}, id=${corto(itemBajo!.id_resultado_inferencia)}` : `id=${corto(itemBajo!.id_resultado_inferencia)} ausente`,
  549 |   );
  550 |   const res02 = await probarClicPendiente(idxBajo2, itemBajo!, 'CP-02_rf72');
  551 |   anotar('CP-02', res02.ok, res02.obtenido);
  552 | 
  553 |   // -- 8. CP-04: fuentes que consulta la vista
  554 |   const enHistorial = peticiones.filter((p) => p.pantalla.endsWith('/prediccion/historial-predictivo'));
  555 |   const getsHist = enHistorial.filter((p) => p.metodo === 'GET' && new RegExp(`/historial-predictivo/${ACTIVO}$`).test(p.ruta));
  556 |   const infsHist = enHistorial.filter((p) => p.ruta.includes('/prediccion/inferencias'));
  557 |   const infsOtras = peticiones.filter((p) => !p.pantalla.endsWith('/prediccion/historial-predictivo') && p.ruta.includes('/prediccion/inferencias'));
  558 |   const ok04 = getsHist.length >= 2 && getsHist.every((p) => p.status === 200) && infsHist.length === 0;
  559 |   anotar(
  560 |     'CP-04',
  561 |     ok04,
  562 |     `GET /historial-predictivo/${ACTIVO}=${getsHist.length} (status=[${getsHist.map((p) => p.status ?? 'sin_resp').join(', ')}]); /prediccion/inferencias en historial=${infsHist.length}${infsHist.length ? ` [${infsHist.map((p) => `${p.metodo} ${p.ruta}`).join(', ')}]` : ''}`,
  563 |   );
  564 |   observaciones.push(`Peticiones a /prediccion/inferencias en otras pantallas: ${infsOtras.length}. Respuestas clave registradas: ${respuestasClave.length}.`);
  565 | 
  566 |   // -- 9. CP-05: la vista es de solo lectura
  567 |   const noGetHistorial = enHistorial.filter(esNoGetApi);
  568 |   const ok05 = estatica.dialogs === 0
  569 |     && estatica.radiogroups === 0
  570 |     && estatica.textareas === 0
  571 |     && estatica.botonesValoracion.length === 0
  572 |     && botonesPendNoPermitidos.length === 0
  573 |     && noGetHistorial.length === 0
  574 |     && res01.noGetEnClic.length === 0
  575 |     && res02.noGetEnClic.length === 0;
  576 |   anotar(
  577 |     'CP-05',
  578 |     ok05,
  579 |     `dialogs=${estatica.dialogs}, radiogroups=${estatica.radiogroups}, textareas=${estatica.textareas}, botones_valoracion=${estatica.botonesValoracion.length} [${estatica.botonesValoracion.join(', ')}], botones_pend=[${estatica.botonesPend.join(', ')}], no_get_historial=${noGetHistorial.length}, no_get_clic_cp01=${res01.noGetEnClic.length}, no_get_clic_cp02=${res02.noGetEnClic.length}`,
  580 |   );
  581 | 
  582 |   // -- 10. Precondicion de despliegue con los scripts que cargo la app
  583 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  584 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  585 |   await page.goto('about:blank');
  586 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  587 |   precondicion(
  588 |     'El frontend desplegado contiene los textos y ruta de RF-106 / RF-72',
  589 |     todo.includes('Registrar retroalimentación')
  590 |       && todo.includes('Predicciones sin evaluar (más de 48 horas)')
  591 |       && todo.includes('Registrar evaluación')
  592 |       && todo.includes('/prediccion/retroalimentacion?resultado='),
  593 |     `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`,
  594 |   );
  595 | 
  596 |   // -- 11. Verificacion final
> 597 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
      |                                               ^ Error: POST /sigab-test/api/prediccion/retroalimentacion
  598 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
  599 | });
  600 | 
```