# Verificación manual de CP-14 y CP-16 en TEST (TC-M08-G021)

- **Fecha:** 2026-11-20, de 20:49 a 21:05 (America/Bogota). La medición válida es la de 21:02 a 21:05.
- **Ambiente:** TEST, `https://api.inmero.co/sigab-test/`, bundle `index-CP69g8wQ.js`, el mismo de la corrida oficial.
- **Navegador:** el navegador integrado de la app de Claude. Sebastian inició sesión y Claude navegó. La ventana se emuló en 1366 × 768, en la zona America/Bogota, y se restableció al terminar.
- **Cuenta:** Veterinario `id_usuario` 159, con las fincas 84, 184 y 57. No es el Veterinario 97 de la corrida. Sebastian decidió aceptarlo: tiene el mismo rol y la finca 184, y lo que se mide es la vista, no la cuenta.
- **Tipo:** solo lectura. No se pulsó «Exportar» ni «Registrar retroalimentación». Solo se eligió el activo, se cambió el modo de visualización y se abrieron los desplegables.
- **Corrida oficial que se confirma:** `qa-m08-g021-20261120-204128`, CP-14 y CP-16 en FALLA.

## Incidencias durante la verificación

| Hora | Qué pasó |
|---|---|
| 20:49 a 20:58 | La API de TEST dejó de responder. Las peticiones a `api-sgpmp-test` quedaban pendientes y terminaban en `ERR_ABORTED`, incluido `POST /sesiones/refresh`. Para comprobar si había red, Claude hizo una única petición propia sin token, un `HEAD /reportes/opciones/activo`, que también quedó colgada. Sebastian confirmó a las 20:58 que TEST volvió. |
| 20:59 a 21:01 | La sesión abierta era de un Administrador. Con esa cuenta se midió la vista en Lineal con el mismo resultado: 0 conectores y ningún «N eventos». Esa medición no cuenta para la constancia. Sebastian cerró esa sesión. |
| 21:02 | Sebastian inició sesión con el Veterinario 159. Desde aquí, la medición que vale. |

## Recorrido

1. Predicción → pestaña «Historial predictivo».
2. En «Animal o lote» se escribió la etiqueta exacta `QA-G88-266-IND-001 · Qa Semaforo Dinamico` (el 885).
3. La app pidió `GET /historial-predictivo/885?fecha_inicio=2025-11-20&fecha_fin=2026-11-20&modo_visualizacion=LINEAL&…` → 200. La respuesta trae:
   - `ventana_correspondencia_horas` = 12;
   - 24 predicciones y 3 eventos;
   - `correspondencias`: d1f3cc43–2684 (600 min, «Diferencia: 10 h», `colision` false) y f056f99d–2685 (30 min, `colision` true);
   - `grupos`: [2685, f056f99d] y las 4 retroalimentaciones del 20/11.
   - El índice de d1f3cc43 es 20, el de f056f99d es 22 y el de 511a6d66 es 23. Los eventos 2684, 2685 y 2686 son los índices 0, 1 y 2. Coincide con la corrida.
4. Se cambió a «Agrupada». La app pidió el mismo GET con `modo_visualizacion=AGRUPADO` → 200.

## Medición

Se leyó la gráfica con JavaScript en la página, con los mismos criterios de la corrida:

- **Punto de la predicción i:** el i-ésimo `.recharts-line-dots circle`.
- **Marcador del evento j:** el j-ésimo `.recharts-scatter-symbol path`.
- **Conector:** un `line` o un `path` con `stroke-dasharray`, fuera de `.recharts-cartesian-grid`.
- **Marcador de grupo:** un `text` «N eventos» dentro de la gráfica.

| Qué se midió | Lineal | Agrupada | Esperado (RF-106) |
|---|---|---|---|
| Puntos y marcadores de evento | 24 y 3 | 24 y 3 | — |
| Elementos punteados fuera de la cuadrícula | **0** | **0** | — |
| Conectores d1f3cc43 ↔ 2684 (10 h) | **0** | **0** | 1 (R5b; CA-7 A) |
| Conectores 511a6d66 ↔ 2686 (20 h) | 0 | 0 | 0 (R5b; CA-7 B) |
| Marcadores «N eventos» en la gráfica | **ninguno** | **ninguno** | «2 eventos» en f056f99d/2685 (R5c; CA-7 C) |
| x del punto f056f99d / x del evento 2685 | 855,4 / 855,5 | 855,4 / 855,5 | Se dibujan por separado |
| Ratón sobre el evento 2684 (Lineal) | Tooltip oculto y vacío; sin `<title>` ni `role="tooltip"` | — | «Diferencia: 10 h» (CA-7 A) |
| Desplegables bajo la gráfica | «2 predicciones relacionadas con eventos» | Además, «2 grupos de eventos cercanos» | — |

**Contenido de los desplegables (Agrupada, abiertos):**

- «2 predicciones relacionadas con eventos»: «Diferencia: 10 h» y «Diferencia: 0 h 30 min». El texto no dice qué predicción ni qué evento.
- «2 grupos de eventos cercanos»:
  - «2 eventos» → «historialpredictivo.tipo.CONTROL_PREVENTIVO · 26/10/26, 4:36 p. m.», «Predicción · 26/10/26, 4:06 p. m.». El orden es correcto (el evento antes que la predicción); la etiqueta del evento es la clave sin traducir (OBS-7).
  - «4 eventos» → cuatro veces «Evaluación · 20/11/26, 10:08 a. m.».

## Registro de red

En la parte medida solo salieron peticiones GET. Las únicas peticiones distintas de GET de todo el intento fueron de sesión y las hizo Sebastian: `POST /sesiones/` (login), `DELETE /sesiones/` (logout del Administrador) y `POST /sesiones/refresh`. A eso se suma el `HEAD` sin token de la incidencia de las 20:49. No hubo `POST /reportes`, retroalimentaciones ni otras escrituras.

## Conclusión

TEST se comporta igual que la corrida oficial:

- **CP-14:** la gráfica no dibuja el conector entre la predicción d1f3cc43 y el evento 2684, a 10 h, en ninguno de los dos modos. Al pasar el ratón sobre el evento no se muestra la diferencia.
- **CP-16:** no hay marcador «N eventos» para f056f99d y 2685, a 30 min. Los dos se dibujan por separado, uno encima del otro (x = 855,4 y 855,5). El grupo solo aparece en la lista desplegable de Agrupada.

El backend sí entrega la correspondencia y el grupo (CP-10 a CP-13), así que el defecto es de la vista: `HistorialPredictivoView.tsx`:237-266.
