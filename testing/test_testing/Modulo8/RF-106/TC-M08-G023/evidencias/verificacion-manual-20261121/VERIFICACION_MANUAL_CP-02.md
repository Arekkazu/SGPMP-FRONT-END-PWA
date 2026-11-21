# Verificación manual de CP-02 en TEST (TC-M08-G023, RF-106 CA-4)

| Fecha | Autor | Qué se hizo |
|---|---|---|
| 2026-11-21 | Juan Sebastian Gutierrez | Verificación manual de CP-02 en TEST con el navegador integrado (Claude navegó; Sebastian inició sesión). Solo lectura |

- **Ambiente:** TEST, `https://api.inmero.co/sigab-test/` (bundle `index-CP69g8wQ.js`, el mismo de la corrida oficial `qa-m08-g023-20261121-052903`).
- **Hora:** 2026-11-21, de 05:39 a 05:57 (America/Bogota).
- **Cuenta:** Veterinario id 159, con las fincas 84, 184 y 57 (comprobada con `GET /usuarios/me`: rol Veterinario). Sebastian inició sesión; aceptó usar esta cuenta en lugar del Veterinario 97.
- **Escrituras:** ninguna. No se envió ningún `POST /prediccion/retroalimentacion` (registro de red); el formulario del control se cerró con «Cancelar».

## Pasos y resultado

1. Predicción → Historial predictivo → «Animal o lote» = `QA-G88-266-IND-001 · Qa Semaforo Dinamico` (885).
   - `GET /historial-predictivo/885?fecha_inicio=2025-11-21&fecha_fin=2026-11-21&modo_visualizacion=LINEAL&...` → 200.
   - TVCO en pantalla: «25% (4 validadas; 20 excluidas: sin retro)». Lista «Predicciones sin evaluar (más de 48 horas)»: 20 ítems, cada uno con «Registrar retroalimentación»: 1 Alto, 4 Medio, 12 Bajo y 3 Sin riesgo. La vista no tiene diálogos, radiogroups ni textareas.
2. **CP-02:** «Registrar retroalimentación» en el ítem 6, «24/10/26, 2:06 p. m. · Bajo · Intoxicación hídrica» (`d1f3cc43-3bf9-4492-a5b9-ec0cc5025d7e`).
   - La app navega a `/sigab-test/prediccion/retroalimentacion?resultado=d1f3cc43-3bf9-4492-a5b9-ec0cc5025d7e&activo=885`.
   - `GET /prediccion/retroalimentacion/bandeja?id_activo_biologico=885&pagina=1&por_pagina=25` → 200 con `total=7` (`ventana_dias=90`; indicadores: 3 pendientes, 4 evaluadas, 0 vencidas). Ítems: 511a6d66 (Alto, PENDIENTE), 997b8cda y 5dbe4510 (Medio, PENDIENTE), 32985675, f80c05d9, 2895a389 y 6e0d4f0f (EVALUADO). **`d1f3cc43` no está.**
   - Tras 6 s: **sin formulario** (0 `role="dialog"`) y sin ningún aviso (0 `role="alert"`/`role="status"`). La página explica: «Aparecen las inferencias que abren un episodio de riesgo moderado o alto, las que generaron una alerta y las ya evaluadas. Cada una se puede evaluar durante 90 días.»
3. En la misma bandeja, filtro «Riesgo inferido» = Bajo: `GET .../bandeja?nivel_riesgo=1&id_activo_biologico=885&...` → 200, 0 pendientes, 0 evaluadas: «No hay inferencias por evaluar con estos filtros.» **La predicción Bajo de 27,6 días no aparece en la bandeja de RF-72 con ningún filtro de riesgo.** (Corrección del 2026-11-21: por lectura de código, la pestaña «Historial» de RF-67, `HistorialTimeline.tsx`:71-74, ofrece «Retroalimentar» en toda inferencia con `id_resultado_inferencia`; verificado en TEST en el paso 5.)
4. **Control (CP-01):** de nuevo en el historial del 885, «Registrar retroalimentación» en el ítem 1, «27/10/26, 7:06 p. m. · Alto · Estrés térmico» (`511a6d66-a862-4822-bf47-2634333531b3`).
   - URL `/sigab-test/prediccion/retroalimentacion?resultado=511a6d66-...&activo=885`; se abre el diálogo «Retroalimentación clínica» con `title="511a6d66-a862-4822-bf47-2634333531b3"`, «Activo biológico: QA-G88-266-IND-001», «Inferencia: del 27/10, 07:06 p. m.».
   - Se cerró con «Cancelar»: ninguna petición POST.

5. **La misma predicción desde Predicción → Historial (RF-67)** (05:55-05:57, nueva sesión de Sebastian con el mismo Veterinario 159, comprobada con `GET /usuarios/me`): «Activo / Lote» = `QA-G88-266-IND-001 (#885)` → «Consultar». La tarjeta «INFERENCIA · Riesgo bajo · 24/10/26, 2:06 p. m.» tiene «Ver detalle» y «Retroalimentar». «Retroalimentar» abre el diálogo «Retroalimentación clínica» con `title="d1f3cc43-3bf9-4492-a5b9-ec0cc5025d7e"` («Activo biológico: QA-G88-266-IND-001 · Inferencia: d1f3cc43-…»). Se cerró con «Cancelar»: 0 POST. **RF-72 sí permite evaluar esta predicción desde el historial del animal; lo que falla es el acceso directo del historial predictivo (RF-106).**

## Conclusión

Confirma CP-02 de la corrida oficial: para los pendientes que la bandeja de RF-72 no incluye (nivel Bajo o Sin riesgo sin alerta ni evaluación). En el 885 son 7 pendientes dentro de la ventana de 90 días de RF-72 (Bajo: 24/10, 19/10, 16/10 y 8/10; Sin riesgo: 26/10, 22/10 y 14/10); los otros 10 que tampoco abren tienen más de 90 días (observación aparte), el botón «Registrar retroalimentación» del historial predictivo no abre el formulario de RF-72 (RF-106 CA-4, Postcondición 2 y Proceso 5) y la app no avisa por qué. El control con el pendiente Alto abre el formulario prellenado (CP-01).

El veterinario puede evaluarla por otra ruta (Predicción → Historial, RF-67, paso 5), pero el acceso directo que exige RF-106 no funciona y no avisa. Según RF-72 v1.2 (RFC-023 C23.4), la bandeja «complementa la entrada desde el historial del animal; no la reemplaza», y RF-72 CA-1 permite evaluar «cualquier resultado de inferencia existente en RF-67».
