# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tc-m08-g029.pw.ts >> TC-M08-G029 baja de activo con confirmación (CP-01 a CP-06)
- Location: testing\test_testing\Modulo8\RF-107\TC-M08-G029\tc-m08-g029.pw.ts:425:1

# Error details

```
Error: CP-05

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  783 |         if (!body || resp.status() !== 200) return route.fulfill({ response: resp });
  784 |         if (/\/ficha-integral\/?$/.test(new URL(req.url()).pathname)) {
  785 |           if (fichaEstadoPrevio !== undefined) { body.estado_actual = fichaEstadoPrevio; vistaSimulada += 1; }
  786 |         } else if (activoEstadoPrevio !== undefined) {
  787 |           body.nombre_estado = activoEstadoPrevio; vistaSimulada += 1;
  788 |         }
  789 |         return route.fulfill({ response: resp, json: body });
  790 |       });
  791 |       // v1.5: CP-06 solo si la baja de CP-03 ocurrio (201); si no, el intento seria la primera baja.
  792 |       const bajaHecha = bajasPost.some((x) => x.status === 201);
  793 |       const prep6 = bajaHecha ? await esperarFichaLista(page, 'CP-06 (vista desactualizada)', true) : { ok: false, detalle: 'no hubo baja 201 en CP-03' };
  794 |       const btnBaja6 = page.getByRole('button', { name: 'Baja', exact: true });
  795 |       const hab6 = prep6.ok && (await btnBaja6.isEnabled().catch(() => false));
  796 |       const okVista = bajaHecha && hab6 && vistaSimulada > 0;
  797 |       // Falla de la herramienta (no del producto): se registra como precondicion falsa sin borrar lo medido en CP-01 a CP-05.
  798 |       precondiciones.push({
  799 |         nombre: 'Vista desactualizada simulada (CP-06): estado previo aplicado y botón «Baja» habilitado',
  800 |         ok: okVista,
  801 |         detalle: `baja_cp03=${bajaHecha}; ${prep6.detalle}; respuestas_simuladas=${vistaSimulada}, estado_ficha_previo=${String(fichaEstadoPrevio)}, estado_activo_previo=${String(activoEstadoPrevio)}, boton_habilitado=${hab6}`,
  802 |       });
  803 |       const successAntesP2 = await p2.locator('.ds-alert--success').count();
  804 |       const postsAntes06 = bajasPost.length;
  805 |       const r06 = okVista ? await abrirYLlenarBaja(p2) : { ok: false, detalle: 'vista desactualizada no aplicada' };
  806 | 
  807 |       if (r06.ok) {
  808 |         const btnConfirmar2 = p2.locator('[role="dialog"]').getByRole('button', { name: 'Confirmar baja', exact: true });
  809 |         if (await btnConfirmar2.isVisible().catch(() => false)) {
  810 |           const promPost2 = p2.waitForResponse(
  811 |             (r) => r.request().method() === 'POST' && new RegExp(`/activos-biologicos/${activoId}/eventos/baja/?$`).test(new URL(r.url()).pathname),
  812 |             { timeout: 15_000 },
  813 |           ).catch(() => null);
  814 |           await btnConfirmar2.click();
  815 |           await promPost2;
  816 |           await p2.waitForTimeout(500);
  817 |         }
  818 |       }
  819 | 
  820 |       await captura(p2, 'CP-06_409');
  821 |       await page.unrouteAll({ behavior: 'ignoreErrors' });
  822 | 
  823 |       // Leer alerta de error en el dialogo (excluyendo el aviso estatico "Registro de baja")
  824 |       const textoErrorDlg = await p2.evaluate(() => {
  825 |         const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
  826 |         const dlg = document.querySelector('[role="dialog"]');
  827 |         if (!dlg) return '';
  828 |         const alertas = Array.from(dlg.querySelectorAll('.ds-alert--error, .ds-alert--warning'));
  829 |         const deError = alertas.filter((el) => {
  830 |           const titulo = n(el.querySelector('.ds-alert__title')?.textContent);
  831 |           return titulo !== 'Registro de baja';
  832 |         });
  833 |         return deError.map((el) => n(el.textContent)).join(' | ');
  834 |       }).catch(() => '');
  835 | 
  836 |       const successDespuesP2 = await p2.locator('.ds-alert--success').count();
  837 |       const nuevasSuccessP2 = Math.max(0, successDespuesP2 - successAntesP2);
  838 |       await registrarToasts(p2, 'CP-06');
  839 | 
  840 |       const todos06 = bajasPost.slice(postsAntes06);
  841 |       const reintentos06 = todos06.filter((x) => x.status === 401);
  842 |       const postsNuevos06 = todos06.filter((x) => x.status !== 401);
  843 |       const ultimoPost06 = postsNuevos06[postsNuevos06.length - 1] ?? null;
  844 | 
  845 |       const palabras = textoErrorDlg.split(/\s+/).filter(Boolean).length;
  846 |       const tieneHttp = /\b(HTTP|Error)\s*\d{3}\b/i.test(textoErrorDlg);
  847 |       const tieneCodigoNum = /\b(400|401|403|404|409|422|500)\b/.test(textoErrorDlg);
  848 |       const tieneSnake = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/.test(textoErrorDlg);
  849 | 
  850 |       observaciones.push(`Mensaje literal del 409 en respuesta API: "${ultimoPost06?.message ?? '(ninguno)'}"; en diálogo: "${textoErrorDlg || '(sin alerta de error en diálogo)'}".`);
  851 | 
  852 |       const ok06 = postsNuevos06.length === 1
  853 |         && ultimoPost06?.status === 409
  854 |         && ultimoPost06?.error_code === 'ACTIVO_YA_EN_BAJA'
  855 |         && textoErrorDlg.length > 0
  856 |         && palabras >= 5
  857 |         && !tieneHttp
  858 |         && !tieneCodigoNum
  859 |         && !tieneSnake
  860 |         && nuevasSuccessP2 === 0;
  861 | 
  862 |       anotar(
  863 |         'CP-06',
  864 |         ok06,
  865 |         `post_nuevos=${postsNuevos06.length}; reintentos_401=${reintentos06.length}${reintentos06.length ? ` [${reintentos06.map((x) => x.error_code ?? 'sin error_code').join(', ')}]` : ''}; status=${ultimoPost06?.status ?? 'ninguno'}; error_code=${ultimoPost06?.error_code ?? 'ninguno'}; palabras=${palabras}; patrones_tecnicos={http=${tieneHttp}, num=${tieneCodigoNum}, snake=${tieneSnake}}; nuevas_alert_success_p2=${nuevasSuccessP2}; texto="${textoErrorDlg || '(sin alerta de error)'}"`,
  866 |       );
  867 |     }
  868 | 
  869 |     // -- Observaciones finales: bundle index-*.js y toasts vistos
  870 |     const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  871 |     observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  872 |     observaciones.push(`Avisos observados en .ds-toasts durante todo el caso: ${toastsVistos.size === 0 ? 'ninguno (0)' : [...toastsVistos].join(' | ')}.`);
  873 |   } finally {
  874 |     // -- D. Cierre, siempre: about:blank en ambas paginas ANTES del rollback (v1.1: que la app no envie peticiones
  875 |     // con el run_id despues del rollback) y luego DELETE del sandbox
  876 |     if (page2) await page2.goto('about:blank').catch(() => undefined);
  877 |     await page.goto('about:blank').catch(() => undefined);
  878 |     // v1.6: sin sandbox no hay rollback; el activo A queda en TEST.
  879 |   }
  880 | 
  881 |   expect(violaciones, violaciones.join('; ')).toEqual([]);
  882 |   expect(respuestas428, respuestas428.join('; ')).toEqual([]);
> 883 |   expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
      |                                                                                                                      ^ Error: CP-05
  884 | });
  885 | 
```