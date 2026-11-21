# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g026.pw.ts >> TC-M08-G026 parte navegador real (CP-21 a CP-24)
- Location: testing\test_testing\Modulo8\RF-107\TC-M08-G026\tc-m08-g026.pw.ts:142:1

# Error details

```
Error: CP-22, CP-23

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  206 |   await page.goto(`${BASE}prediccion/historial-predictivo`);
  207 |   const opciones = (await (await respOpciones).json()) as Array<{ valor: number; etiqueta: string }>;
  208 |   const opcion = opciones.find((o) => Number(o.valor) === ACTIVO);
  209 |   precondicion(`El activo ${ACTIVO} figura entre los animales o lotes del Veterinario`, !!opcion, `${opciones.length} opciones`);
  210 |   const respHistorial = page.waitForResponse((r) => new RegExp(`/historial-predictivo/${ACTIVO}(\\?|$)`).test(r.url()), { timeout: 30_000 });
  211 |   const combo = page.getByRole('combobox', { name: 'Animal o lote' });
  212 |   await combo.fill(opcion!.etiqueta);
  213 |   const opcionLista = page.getByRole('option', { name: opcion!.etiqueta, exact: true });
  214 |   if (await opcionLista.count()) await opcionLista.first().click();
  215 |   const estadoHistorial = (await respHistorial).status();
  216 |   precondicion(`GET /historial-predictivo/${ACTIVO} responde 200`, estadoHistorial === 200, `HTTP ${estadoHistorial}`);
  217 |   const exportar = page.getByRole('button', { name: /Exportar historial sanitario/ });
  218 |   await expect(exportar).toBeEnabled({ timeout: 30_000 });
  219 | 
  220 |   // Control: un exito real que expira solo (estado en el historial, ver OBS-10)
  221 |   modoExportar = 'exito';
  222 |   await exportar.click();
  223 |   const exito = page.locator('.ds-toasts .ds-alert--success');
  224 |   await expect(exito).toBeVisible({ timeout: 10_000 });
  225 |   const cajaExito = await caja(page, '.ds-toasts .ds-alert--success');
  226 |   await expect(exito).toBeHidden({ timeout: 8_000 });
  227 | 
  228 |   // Seis errores simulados (sin idOperacion: cada uno es un aviso nuevo)
  229 |   modoExportar = 'error';
  230 |   const viewport = page.viewportSize()!;
  231 |   let cajaError: Caja = null;
  232 |   let cajaAppBar: Caja = null;
  233 |   for (let i = 1; i <= 6; i += 1) {
  234 |     const antes = exportados;
  235 |     await expect(exportar).toBeEnabled({ timeout: 15_000 });
  236 |     await exportar.click();
  237 |     await expect.poll(() => exportados, { timeout: 10_000 }).toBe(antes + 1);
  238 |     await expect(exportar).toBeEnabled({ timeout: 15_000 });
  239 |     if (i === 1) {
  240 |       await expect(page.locator('.ds-toasts .ds-alert--error').first()).toBeVisible();
  241 |       cajaError = await caja(page, '.ds-toasts .ds-alert--error');
  242 |       cajaAppBar = await caja(page, '.ds-appbar');
  243 |       await captura(page, 'CP-22_banner_error');
  244 |     }
  245 |   }
  246 |   const saturacion = page.locator('.ds-toasts__saturacion');
  247 |   await expect(saturacion).toBeVisible({ timeout: 10_000 });
  248 |   const textoSaturacion = norm(await saturacion.textContent());
  249 |   const finAppBar = cajaAppBar ? cajaAppBar.y + cajaAppBar.h : 0;
  250 |   const arriba = (c: Caja) => !!c && c.y >= finAppBar - 2 && c.y <= viewport.height / 3;
  251 |   anotar('CP-22', arriba(cajaError) && arriba(cajaExito),
  252 |     `Ventana ${viewport.width}x${viewport.height}; AppBar termina en y=${finAppBar}; banner de error en ${JSON.stringify(cajaError)}; banner de exito en ${JSON.stringify(cajaExito)}; tercio superior hasta y=${Math.round(viewport.height / 3)}`);
  253 | 
  254 |   // -- Paso 3: historial de la sesion -> CP-23
  255 |   await saturacion.click();
  256 |   const dialogo = page.getByRole('dialog', { name: 'Avisos de esta sesión' });
  257 |   await expect(dialogo).toBeVisible();
  258 |   const cajaPanel = await caja(page, '[role="dialog"][aria-modal="true"] .ds-modal__panel');
  259 |   const lateral = !!cajaPanel && (cajaPanel.x <= 2 || cajaPanel.x + cajaPanel.w >= viewport.width - 2) && cajaPanel.h >= viewport.height * 0.9;
  260 |   await captura(page, 'CP-23_historial');
  261 |   anotar('CP-23', lateral, `Panel "Avisos de esta sesión" en ${JSON.stringify(cajaPanel)} dentro de una ventana ${viewport.width}x${viewport.height} (lateral = toca x=0 o x=${viewport.width} y alto >= ${Math.round(viewport.height * 0.9)})`);
  262 |   const filas = (await dialogo.locator('.ds-toasts__historial li').allTextContents()).map(norm);
  263 |   const filaExito = filas.find((f) => f.includes('El historial sanitario se descargó'));
  264 |   observaciones.push(`OBS-10 (control en navegador real del criterio R-2 de Vitest): el exito que expiro solo figura en el historial como ${filaExito ? `"${filaExito}"` : '(ausente)'}. Aviso de saturacion: "${textoSaturacion}". Filas del historial: ${filas.length}.`);
  265 |   await page.keyboard.press('Escape');
  266 |   await expect(dialogo).toBeHidden({ timeout: 5_000 });
  267 | 
  268 |   // -- Paso 4: cerrar sesion con la cola llena -> CP-21
  269 |   const antesLogout = { errores: await page.locator('.ds-toasts .ds-alert--error').count(), saturacion: await saturacion.isVisible() };
  270 |   await page.evaluate((id) => { (window as unknown as Record<string, string>).__qaG026 = id; }, process.env.RUN_ID ?? 'qa');
  271 |   await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
  272 |   await page.waitForURL((u) => u.pathname.endsWith('/login'), { timeout: 30_000 }).catch(() => undefined);
  273 |   // React Router puede llegar a /login dentro de la misma pagina antes de que location.replace la recargue: se
  274 |   // espera hasta 15 s a que desaparezca el marcador (documento nuevo). Si nunca recarga, el marcador sigue y
  275 |   // CP-21 queda en FALLA con ese dato.
  276 |   const limite = Date.now() + 15_000;
  277 |   while (Date.now() < limite) {
  278 |     const sigue = await page.evaluate(() => '__qaG026' in window).catch(() => true);
  279 |     if (!sigue) break;
  280 |     await page.waitForTimeout(250);
  281 |   }
  282 |   await page.waitForLoadState('load');
  283 |   await page.waitForTimeout(1_000);
  284 |   const tras = await page.evaluate(() => ({
  285 |     marcador: (window as unknown as Record<string, unknown>).__qaG026 ?? null,
  286 |     avisos: document.querySelectorAll('.ds-toasts .ds-alert').length,
  287 |     saturacion: document.querySelectorAll('.ds-toasts__saturacion').length,
  288 |     navegacion: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? '?',
  289 |   }));
  290 |   const enLogin = new URL(page.url()).pathname.endsWith('/login');
  291 |   anotar('CP-21', enLogin && tras.marcador === null && tras.avisos === 0 && tras.saturacion === 0,
  292 |     `Antes de cerrar sesion: ${antesLogout.errores} banners de error y aviso de saturacion ${antesLogout.saturacion ? 'visible' : 'ausente'}. Despues: ruta ${new URL(page.url()).pathname}, marcador ${tras.marcador === null ? 'ausente (documento nuevo)' : 'PRESENTE'}, navegacion "${tras.navegacion}", ${tras.avisos} avisos, ${tras.saturacion} avisos de saturacion`);
  293 | 
  294 |   // -- Precondicion de despliegue (#693) con los scripts que cargo la app
  295 |   const todo = scripts.map((s) => s.cuerpo).join('\n');
  296 |   const index = scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n));
  297 |   precondicion('El frontend desplegado tiene la entrega #693 (ds-toasts__saturacion, ds-sync, "Toca aquí para ver todas")',
  298 |     todo.includes('ds-toasts__saturacion') && todo.includes('ds-sync') && todo.includes('Toca aquí para ver todas'),
  299 |     `bundle: ${[...new Set(index)].join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);
  300 |   // La pagina final (login) no se deja abierta: si el test termina en FALLA, Playwright guarda un error-context.md con
  301 |   // la instantanea de la pagina, y asi queda en blanco.
  302 |   await page.goto('about:blank');
  303 |   observaciones.push(`Despliegue: bundle ${[...new Set(index)].join(', ') || '(no identificado)'} en ${BASE}.`);
  304 | 
  305 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 306 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-22, CP-23
  307 | });
  308 | 
```