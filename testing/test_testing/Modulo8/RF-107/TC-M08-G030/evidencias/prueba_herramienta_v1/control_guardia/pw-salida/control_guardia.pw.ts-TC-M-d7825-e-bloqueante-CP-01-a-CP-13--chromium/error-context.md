# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: control_guardia.pw.ts >> TC-M08-G030 offline, tiempos de banners/modal y cierre bloqueante (CP-01 a CP-13)
- Location: testing\test_testing\Modulo8\RF-107\TC-M08-G030\evidencias\prueba_herramienta_v1\controles\control_guardia.pw.ts:803:1

# Error details

```
Error: POST /sigab-test/api/activos-biologicos/885/eventos/baja

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "POST /sigab-test/api/activos-biologicos/885/eventos/baja",
+ ]
```

# Test source

```ts
  936  |       };
  937  | 
  938  |       const revisarOpcionesPeriodo = async (): Promise<boolean> => {
  939  |         if (await revisarPeriodoActual()) return true;
  940  |         if (await selPeriodo.isVisible().catch(() => false)) {
  941  |           const opts = await selPeriodo.locator('option').evaluateAll((els) =>
  942  |             els.map((e) => ({ val: (e as HTMLOptionElement).value, txt: (e.textContent ?? '').trim() })),
  943  |           );
  944  |           for (const opt of opts) {
  945  |             if (!opt.val) continue;
  946  |             periodosVistos.push(`${opt.val}:${opt.txt}`);
  947  |             await selPeriodo.selectOption(opt.val);
  948  |             if (await revisarPeriodoActual()) return true;
  949  |           }
  950  |         }
  951  |         return false;
  952  |       };
  953  | 
  954  |       if (await selTitular.isVisible().catch(() => false)) {
  955  |         const tits = await selTitular.locator('option').evaluateAll((els) =>
  956  |           els.map((e) => (e as HTMLOptionElement).value),
  957  |         );
  958  |         for (const tVal of tits) {
  959  |           await selTitular.selectOption(tVal);
  960  |           await pAdmin.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  961  |           if (await revisarOpcionesPeriodo()) { encontrado = true; break; }
  962  |         }
  963  |       } else {
  964  |         encontrado = await revisarOpcionesPeriodo();
  965  |       }
  966  | 
  967  |       precondicion(
  968  |         'Período contable cerrable con botón «Cerrar período» habilitado',
  969  |         encontrado,
  970  |         encontrado ? 'botón «Cerrar período» habilitado' : `ninguno habilitado; vistos=[${periodosVistos.join('; ')}]`,
  971  |       );
  972  | 
  973  |       // CP-13: instalar page.clock antes de abrir el dialogo
  974  |       const postCierreAntes = intentosPostCierre;
  975  |       await pAdmin.clock.install();
  976  |       await btnCerrarPeriodo.click();
  977  |       const dlgCierre = pAdmin.locator('[role="dialog"]').first();
  978  |       const abiertoInicial = await dlgCierre.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
  979  |       await captura(pAdmin, 'CP-13_cierre');
  980  | 
  981  |       // 1) Escape (esperar 500 ms)
  982  |       await pAdmin.keyboard.press('Escape');
  983  |       await new Promise((r) => setTimeout(r, 500));
  984  |       const abiertoTrasEsc = await dlgCierre.isVisible().catch(() => false);
  985  | 
  986  |       // 2) Clic en overlay fuera del panel (esquina superior izquierda 10, 10)
  987  |       await pAdmin.mouse.click(10, 10);
  988  |       await new Promise((r) => setTimeout(r, 200));
  989  |       const abiertoTrasOverlay = await dlgCierre.isVisible().catch(() => false);
  990  | 
  991  |       // 3) Presencia de boton X de cierre
  992  |       const tieneX = (await dlgCierre.locator('button[aria-label*="Cerrar" i], button[aria-label*="Close" i]').count().catch(() => 0)) > 0;
  993  | 
  994  |       // 4) page.clock.fastForward('10:00')
  995  |       await pAdmin.clock.fastForward('10:00');
  996  |       await new Promise((r) => setTimeout(r, 200));
  997  |       const abiertoTras10m = await dlgCierre.isVisible().catch(() => false);
  998  |       const urlFinal = new URL(pAdmin.url()).pathname;
  999  |       const enLogin = urlFinal.endsWith('/login');
  1000 |       const postCierreNuevos = intentosPostCierre - postCierreAntes;
  1001 | 
  1002 |       if (enLogin) {
  1003 |         observaciones.push(`CP-13: fastForward('10:00') redirigió la app a ${urlFinal}.`);
  1004 |       }
  1005 | 
  1006 |       // Cerrar con Cancelar
  1007 |       if (abiertoTras10m) {
  1008 |         const btnCan = dlgCierre.getByRole('button', { name: 'Cancelar', exact: true });
  1009 |         if (await btnCan.isVisible().catch(() => false)) await btnCan.click();
  1010 |       }
  1011 | 
  1012 |       const ok13 = abiertoInicial
  1013 |         && abiertoTrasEsc
  1014 |         && abiertoTrasOverlay
  1015 |         && !tieneX
  1016 |         && abiertoTras10m
  1017 |         && !enLogin
  1018 |         && postCierreNuevos === 0;
  1019 | 
  1020 |       anotar(
  1021 |         'CP-13',
  1022 |         ok13,
  1023 |         `inicial=${abiertoInicial ? 'sí' : 'no'}; tras_escape=${abiertoTrasEsc ? 'sí' : 'no'}; tras_overlay=${abiertoTrasOverlay ? 'sí' : 'no'}; boton_X=${tieneX ? 'sí' : 'no'}; tras_10m=${abiertoTras10m ? 'sí' : 'no'}; url=${urlFinal}; post_cierre=${postCierreNuevos}`,
  1024 |       );
  1025 |     } finally {
  1026 |       await pAdmin.goto('about:blank').catch(() => undefined);
  1027 |       await ctxAdmin.close().catch(() => undefined);
  1028 |     }
  1029 |   } finally {
  1030 |     await wb.close().catch(() => undefined);
  1031 |   }
  1032 | 
  1033 |   const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  1034 |   observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  1035 | 
> 1036 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
       |                                               ^ Error: POST /sigab-test/api/activos-biologicos/885/eventos/baja
  1037 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
  1038 | });
  1039 | 
```