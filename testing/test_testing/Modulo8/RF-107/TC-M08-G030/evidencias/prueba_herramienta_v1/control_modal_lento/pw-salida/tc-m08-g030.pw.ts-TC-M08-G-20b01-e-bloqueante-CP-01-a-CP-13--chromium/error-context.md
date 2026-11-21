# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g030.pw.ts >> TC-M08-G030 offline, tiempos de banners/modal y cierre bloqueante (CP-01 a CP-13)
- Location: testing\test_testing\Modulo8\RF-107\TC-M08-G030\tc-m08-g030.pw.ts:795:1

# Error details

```
Error: CP-06, CP-12

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  929  | 
  930  |       const revisarOpcionesPeriodo = async (): Promise<boolean> => {
  931  |         if (await revisarPeriodoActual()) return true;
  932  |         if (await selPeriodo.isVisible().catch(() => false)) {
  933  |           const opts = await selPeriodo.locator('option').evaluateAll((els) =>
  934  |             els.map((e) => ({ val: (e as HTMLOptionElement).value, txt: (e.textContent ?? '').trim() })),
  935  |           );
  936  |           for (const opt of opts) {
  937  |             if (!opt.val) continue;
  938  |             periodosVistos.push(`${opt.val}:${opt.txt}`);
  939  |             await selPeriodo.selectOption(opt.val);
  940  |             if (await revisarPeriodoActual()) return true;
  941  |           }
  942  |         }
  943  |         return false;
  944  |       };
  945  | 
  946  |       if (await selTitular.isVisible().catch(() => false)) {
  947  |         const tits = await selTitular.locator('option').evaluateAll((els) =>
  948  |           els.map((e) => (e as HTMLOptionElement).value),
  949  |         );
  950  |         for (const tVal of tits) {
  951  |           await selTitular.selectOption(tVal);
  952  |           await pAdmin.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  953  |           if (await revisarOpcionesPeriodo()) { encontrado = true; break; }
  954  |         }
  955  |       } else {
  956  |         encontrado = await revisarOpcionesPeriodo();
  957  |       }
  958  | 
  959  |       precondicion(
  960  |         'Período contable cerrable con botón «Cerrar período» habilitado',
  961  |         encontrado,
  962  |         encontrado ? 'botón «Cerrar período» habilitado' : `ninguno habilitado; vistos=[${periodosVistos.join('; ')}]`,
  963  |       );
  964  | 
  965  |       // CP-13: instalar page.clock antes de abrir el dialogo
  966  |       const postCierreAntes = intentosPostCierre;
  967  |       await pAdmin.clock.install();
  968  |       await btnCerrarPeriodo.click();
  969  |       const dlgCierre = pAdmin.locator('[role="dialog"]').first();
  970  |       const abiertoInicial = await dlgCierre.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
  971  |       await captura(pAdmin, 'CP-13_cierre');
  972  | 
  973  |       // 1) Escape (esperar 500 ms)
  974  |       await pAdmin.keyboard.press('Escape');
  975  |       await new Promise((r) => setTimeout(r, 500));
  976  |       const abiertoTrasEsc = await dlgCierre.isVisible().catch(() => false);
  977  | 
  978  |       // 2) Clic en overlay fuera del panel (esquina superior izquierda 10, 10)
  979  |       await pAdmin.mouse.click(10, 10);
  980  |       await new Promise((r) => setTimeout(r, 200));
  981  |       const abiertoTrasOverlay = await dlgCierre.isVisible().catch(() => false);
  982  | 
  983  |       // 3) Presencia de boton X de cierre
  984  |       const tieneX = (await dlgCierre.locator('button[aria-label*="Cerrar" i], button[aria-label*="Close" i]').count().catch(() => 0)) > 0;
  985  | 
  986  |       // 4) page.clock.fastForward('10:00')
  987  |       await pAdmin.clock.fastForward('10:00');
  988  |       await new Promise((r) => setTimeout(r, 200));
  989  |       const abiertoTras10m = await dlgCierre.isVisible().catch(() => false);
  990  |       const urlFinal = new URL(pAdmin.url()).pathname;
  991  |       const enLogin = urlFinal.endsWith('/login');
  992  |       const postCierreNuevos = intentosPostCierre - postCierreAntes;
  993  | 
  994  |       if (enLogin) {
  995  |         observaciones.push(`CP-13: fastForward('10:00') redirigió la app a ${urlFinal}.`);
  996  |       }
  997  | 
  998  |       // Cerrar con Cancelar
  999  |       if (abiertoTras10m) {
  1000 |         const btnCan = dlgCierre.getByRole('button', { name: 'Cancelar', exact: true });
  1001 |         if (await btnCan.isVisible().catch(() => false)) await btnCan.click();
  1002 |       }
  1003 | 
  1004 |       const ok13 = abiertoInicial
  1005 |         && abiertoTrasEsc
  1006 |         && abiertoTrasOverlay
  1007 |         && !tieneX
  1008 |         && abiertoTras10m
  1009 |         && !enLogin
  1010 |         && postCierreNuevos === 0;
  1011 | 
  1012 |       anotar(
  1013 |         'CP-13',
  1014 |         ok13,
  1015 |         `inicial=${abiertoInicial ? 'sí' : 'no'}; tras_escape=${abiertoTrasEsc ? 'sí' : 'no'}; tras_overlay=${abiertoTrasOverlay ? 'sí' : 'no'}; boton_X=${tieneX ? 'sí' : 'no'}; tras_10m=${abiertoTras10m ? 'sí' : 'no'}; url=${urlFinal}; post_cierre=${postCierreNuevos}`,
  1016 |       );
  1017 |     } finally {
  1018 |       await pAdmin.goto('about:blank').catch(() => undefined);
  1019 |       await ctxAdmin.close().catch(() => undefined);
  1020 |     }
  1021 |   } finally {
  1022 |     await wb.close().catch(() => undefined);
  1023 |   }
  1024 | 
  1025 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  1026 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  1027 | 
  1028 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
> 1029 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
       |                                                                                                                      ^ Error: CP-06, CP-12
  1030 | });
  1031 | 
```