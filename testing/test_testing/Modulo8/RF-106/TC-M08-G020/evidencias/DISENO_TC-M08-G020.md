# Diseño de TC-M08-G020: línea de tiempo, marcadores, hora de Bogotá y estados vacíos o parciales (RF-106)

## Historial de cambios

| Fecha | Autor | Descripción |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 (Claude) y Fase 2 (Argon): spec Vitest y runner |

---

## 1. Casos cubiertos y justificación

- **Casos:** TC-M08-051 (Línea de tiempo, marcadores y hora de Bogotá) y TC-M08-057 (Estados vacíos o parciales del historial predictivo).
- **Requerimiento:** RF-106 (Visualización del historial predictivo y validación clínica).
- **Herramienta:** Vitest 4.1.11 con jsdom, con respuestas simuladas en el cliente `http` (`http.defaults.adapter`) con la forma real de `consultar_historial_predictivo_use_case.py`.
- **HEAD del frontend bajo prueba:** `3358b032`.

---

## 2. Fase 1 (Claude)

1. **Línea de tiempo y marcadores (`HistorialPredictivoView.tsx:229-247`):**
   - `<Line data={puntos.linea} dataKey="nivel" type="stepAfter" stroke="var(--brand-600, #2f5d3a)" dot isAnimationActive={false} />` (`:237`) dibuja la serie del nivel de riesgo (`0` a `3`).
   - `<Scatter data={puntos.eventos} dataKey="y" fill="var(--danger-600, #dc2626)" shape="square" isAnimationActive={false} />` (`:238`) dibuja los eventos sanitarios como cuadros rojos sólidos en `Y_EVENTO = 3.6`.
   - `<Scatter data={puntos.retros} dataKey="y" fill="var(--info-600, #2563eb)" shape={...} isAnimationActive={false} />` (`:239-244`) dibuja las valoraciones clínicas en `Y_RETRO = 3.3` con los iconos `✓` (`CORRECTO`), `✗` (`INCORRECTO`), `◐` (`PARCIAL`), `○` (`SIN_EVENTO`) y `⚠` (`en_conflicto`) en `:242`.
2. **Eje X con `domain={['dataMin', 'dataMax']}` (`HistorialPredictivoView.tsx:233`):**
   - `<XAxis dataKey="x" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(v) => new Date(v).toLocaleDateString()} />` toma como extremos del eje X el mínimo y máximo de los datos presentes (`dataMin`/`dataMax`), en lugar del rango de fechas seleccionado en los controles (`desde`/`hasta`), como pide RF-106 Proceso 3 («Eje X: tiempo (rango seleccionado)»).
3. **Horas y zona horaria (`formato.ts:42-50` y `http.ts:18`):**
   - `formatearFechaHora` (`src/shared/i18n/formato.ts:42-50`) llama `fecha.toLocaleString(locale(), opciones)` con `{ dateStyle: 'short', timeStyle: 'short' }` sin fijar `timeZone: 'America/Bogota'`, por lo que formatea en la zona horaria del proceso/equipo.
   - `src/shared/api/http.ts:18` envía la zona del navegador en la cabecera `X-Zona-Horaria` (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
4. **Mensaje sin inferencias, fuentes no disponibles y TVCO sin datos:**
   - Cuando no hay inferencias en el rango, el backend (`consultar_historial_predictivo_use_case.py:40` y `:143`) devuelve `mensaje = "Este animal no tiene predicciones en el rango elegido. Prueba con otro rango de fechas; los eventos sanitarios registrados sí se muestran."`, que la vista muestra en `HistorialPredictivoView.tsx:222` (`{datos.mensaje && <Alert variant="info" title={datos.mensaje} />}`).
   - Cuando fallan fuentes secundarias, `datos.fuentes_no_disponibles` se muestra en `HistorialPredictivoView.tsx:199-201` con `<Alert variant="warning" title={t('historialpredictivo.fuentes_parciales')} description={datos.fuentes_no_disponibles.join(', ')} />`.
   - Sin inferencias validadas, la TVCO muestra `"Sin datos suficientes para calcular"` (`historial_predictivo.py:59`).

---

## 3. Decisiones de Sebastian (2026-11-20)

1. **CP-04 (Hora de Bogotá) y OBS-1:** CP-04 se mide con el equipo configurado en `America/Bogota` (`$env:TZ = 'America/Bogota'`), comparando contra `new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' })`. La dependencia respecto a la zona horaria del equipo se registra como observación (`OBS-1`) para los líderes.
2. **CP-05 (Eje X en el rango seleccionado):** Se evalúa como checkpoint obligatorio contra RF-106 Proceso 3 («Eje X: tiempo (rango seleccionado)»), con `FALLA` prevista dado que la vista usa `domain={['dataMin', 'dataMax']}`.
3. **Textos del CU04 (OBS-2):** Los textos literales frente a los borradores del CU04 se registran como observación (`OBS-2`), porque la celda de flujos alternos del RF está vacía y CA-13 solo exige «mensaje orientativo».

---

## 4. Tabla de los 8 checkpoints

| Paso | Caso | Esperado | Fuente | Previsto |
|---|---|---|---|---|
| **CP-01** | `051 Línea por nivel de riesgo (885)` | `7 puntos; ordenados por cx, sus niveles son 0,1,2,3,2,1,0; puntos del mismo nivel tienen el mismo cy (±1 px) y a mayor nivel menor cy (estricto); el eje Y muestra exactamente "Sin riesgo", "Bajo", "Medio", "Alto"` | `RF-106 Proceso 3 (eje Y: nivel 0-3; línea con el nivel_riesgo)` | `OK` |
| **CP-02** | `051 Eventos sanitarios (885)` | `2 marcadores de evento con relleno rojo (fill que contiene "--danger-600" o "#dc2626"); posición temporal: para TODOS los marcadores (puntos, eventos y valoraciones), (x − xmin)/(xmax − xmin) = (t − tmin)/(tmax − tmin) con tolerancia 0,01; y el evento 2684 tiene el mismo x que el punto p2 (±1 px)` | `RF-106 Proceso 3 (rojo sólido); CA-2` | `OK` |
| **CP-03** | `051 Valoraciones (885)` | `4 marcadores; ordenados por x, sus textos son exactamente ✓, ✗, ◐, ○ (CORRECTO, INCORRECTO, PARCIAL, SIN_EVENTO)` | `RF-106 Proceso 3` | `OK` |
| **CP-04** | `051 Hora de Bogotá (885)` | `en la lista de pendientes, la parte de fecha y hora (texto antes del primer " · ") de p1, p2 y p3 es igual a new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }) para 2026-10-10T15:00:00Z, 2026-10-11T03:00:00Z y 2026-10-11T05:00:00Z, es decir 10/10 10:00, 10/10 22:00 y 11/10 00:00 en Bogotá. Calcula el esperado con timeZone explícito, no con el formateador de la app` | `RF-106 Restricción 5a; Proceso 2.1 (medido con el equipo en America/Bogota; decisión de Sebastian 2026-11-20)` | `OK` |
| **CP-05** | `051 Eje X en el rango seleccionado (885, rango por defecto 2025-11-20 a 2026-11-20)` | `tomando como dominio el rango elegido en días completos de Bogotá (inicio 2025-11-20T05:00:00Z, fin 2026-11-21T04:59:59.999Z), la posición relativa en el área de trazado (x − x1)/(x2 − x1) del primer marcador (p1, 2026-10-10T15:00:00Z) y del último (valoración de 2026-10-31T12:00:00Z) es (t − inicio)/(fin − inicio) con tolerancia 0,02 (≈ 0,886 y ≈ 0,943; calcula tú el valor exacto)` | `RF-106 Proceso 3 ("Eje X: tiempo (rango seleccionado)")` | `FALLA` |
| **CP-06** | `057 a Sin inferencias (3001)` | `aparece el aviso informativo con el texto literal del mensaje; no aparece "No se pudo cargar el historial"; existen '.recharts-xAxis' y '.recharts-yAxis'; 0 puntos de línea; 1 marcador de evento; TVCO "Sin datos suficientes para calcular"; luego, con Desde=2026-01-01, sale una nueva petición con fecha_inicio=2026-01-01 y el aviso sigue visible` | `RF-106 CA-13; Precondición 3` | `OK` |
| **CP-07** | `057 b Fuente de eventos no disponible (3002)` | `aviso "Algunos datos no están disponibles en este momento" cuyo detalle contiene "Eventos sanitarios"; 7 puntos; 4 valoraciones; 0 eventos; sin "No se pudo cargar el historial"` | `RF-106 RNF-06; CA-13` | `OK` |
| **CP-08** | `057 c Fuente de retroalimentación no disponible (3003)` | `el mismo aviso con "Retroalimentación clínica" en el detalle; 7 puntos; 2 eventos; 0 valoraciones; sin "No se pudo cargar el historial"` | `RF-106 RNF-06; CA-13` | `OK` |

---

## 5. Observaciones (OBS-1 a OBS-5)

- **OBS-1:** `OBS-1: zona del proceso=America/Bogota; header X-Zona-Horaria enviado=America/Bogota; formatearFechaHora usa toLocaleString sin timeZone (src/shared/i18n/formato.ts:49): 2026-10-11T03:00:00Z en America/Bogota="10/10/26, 10:00 p. m.", en UTC="11/10/26, 3:00 a. m.". Decisión de Sebastian 2026-11-20: se acepta como lo maneja la app; para los líderes.`
- **OBS-2:** `OBS-2: textos reales frente al CU04: en 3001 se muestra "Este animal no tiene predicciones en el rango elegido. Prueba con otro rango de fechas; los eventos sanitarios registrados sí se muestran." (CU04: "No se registran inferencias predictivas para este activo en el periodo seleccionado"); en 3002 se muestra título="Algunos datos no están disponibles en este momento" y detalle="Eventos sanitarios" (CU04: "Datos de eventos/retroalimentación temporalmente no disponibles").`
- **OBS-3:** `OBS-3: con 3004 (HTTP 500 ERROR_INTERNO): título="No se pudo cargar el historial", detalle="Ocurrió un error interno."`
- **OBS-4:** `OBS-4: marcas del eje X en 885 (7): ["10/10/2026", "10/10/2026", "18/10/2026", "28/10/2026", "29/10/2026", "30/10/2026", "31/10/2026"]`
- **OBS-5:** `OBS-5: en 3001 (un solo marcador de evento), x=427, Number.isFinite(x)=true`

---

## 6. Datos simulados y selectores usados

### 6.1 Datos simulados
- **Opciones de activo (`GET /reportes/opciones/activo`):**
  - `885`: `"QA-885 · Bovino"` (conjunto BASE: 7 predicciones `p1..p7` con niveles `0,1,2,3,2,1,0`; 2 eventos `2684` en `2026-10-11T03:00:00Z` y `2685` en `2026-10-18T12:00:00Z`; 4 retroalimentaciones `p4..p7` con `CORRECTO`, `INCORRECTO`, `PARCIAL`, `SIN_EVENTO`; 3 pendientes `p3, p2, p1`; TVCO `"25% (4 validadas)"`).
  - `3001`: `"QA-3001 · Sin inferencias"` (`predicciones: []`, `eventos_sanitarios: [2685]`, `retroalimentaciones: []`, `pendientes: {total: 0, items: []}`, TVCO `"Sin datos suficientes para calcular"`, `mensaje` literal de `consultar_historial_predictivo_use_case.py:40`).
  - `3002`: `"QA-3002 · Sin eventos"` (BASE con `eventos_sanitarios: []`, `total_eventos_sanitarios: 0`, `fuentes_no_disponibles: ["Eventos sanitarios"]`).
  - `3003`: `"QA-3003 · Sin retroalimentacion"` (BASE con `retroalimentaciones: []`, `tiene_retroalimentacion: false`, TVCO `"Sin datos suficientes para calcular"`, `total_retroalimentaciones: 0`, `fuentes_no_disponibles: ["Retroalimentación clínica"]`).
  - `3004`: `"QA-3004 · Error 500"` (HTTP 500 `ERROR_INTERNO`: `"Ocurrió un error interno."`).

### 6.2 Selectores usados y motivo del cambio de selector en las etiquetas de los ejes
- **Puntos de la línea:** `.recharts-line-dots circle` (atributos `cx`, `cy`).
- **Marcadores de evento:** `.recharts-scatter-symbol path` (centro `x, y`: atributos `cx`/`cy` si existen; si no, `translate(x, y)` del atributo `transform` o punto medio del `d` del `<path>`; color: atributo `fill` del `path`, de su padre o de `.recharts-scatter`).
- **Marcadores de valoración:** `.recharts-scatter-symbol text` (atributos `x`, `y` y su `textContent`).
- **Existencia de ejes (CP-06):** `.recharts-xAxis` y `.recharts-yAxis`.
- **Extremos horizontales del área de trazado (CP-05):** atributos `x1` y `x2` de `.recharts-xAxis line.recharts-cartesian-axis-line` (`x1=70`, `x2=784`).
- **Etiquetas del eje Y (CP-01):** `.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value`.
- **Etiquetas del eje X (OBS-4):** `.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value`.
- **Motivo del cambio de selector en etiquetas de ejes:** En `recharts@3.10.0` (`CartesianAxis.js:381-385` y `ZIndexLayer.js:132`), el subcomponente `Ticks` envuelve `<g class="recharts-cartesian-axis-tick-labels recharts-yAxis-tick-labels">` (y el homólogo de `xAxis`) dentro de `<ZIndexLayer zIndex={DefaultZIndexes.label}>` (`zIndex = 2000`), que los renderiza mediante `ReactDOM.createPortal` en un `<g class="recharts-zindex-2000">` en la raíz del `<svg>`, fuera de `.recharts-yAxis` y `.recharts-xAxis`. Por ello, `.recharts-yAxis .recharts-cartesian-axis-tick-value` devolvía 0 nodos, mientras que `.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value` y `.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value` seleccionan directamente los grupos de etiquetas renderizados en el portal.
- **Ítems de la lista de pendientes (CP-04):** `document.querySelectorAll('li span')` excluyendo opciones de combobox (`el.closest('li')?.getAttribute('role') !== 'option'`) y filtrando textos con `' · '`.

---

## 7. Prueba de la herramienta (`evidencias/prueba_herramienta_v2/`)

### 7.1 Ejecuciones normales (4.1)

- **`normal_1`:** `Test Files 1 failed (1) | Tests 1 failed | 7 passed (8)` (7 OK: CP-01, CP-02, CP-03, CP-04, CP-06, CP-07, CP-08; 1 FALLA: CP-05 con `pos_rel_medida=0.0000 (esperada=0.8864)` y `pos_rel_medida=1.0000 (esperada=0.9434)`).
- **`normal_2`:** `Test Files 1 failed (1) | Tests 1 failed | 7 passed (8)` (idéntico a `normal_1`).
- **`normal_3`:** `Test Files 1 failed (1) | Tests 1 failed | 7 passed (8)` (idéntico a `normal_1`).

### 7.2 Controles por mutación (4.2)

| Control | Mutación en el simulador | Resumen Vitest | Checkpoints en FALLA y `obtenido` literal |
|---|---|---|---|
| **niveles** | 885 devuelve `nivel_riesgo: 0` en todas las predicciones | `Test Files 1 failed (1) \| Tests 2 failed \| 6 passed (8)` | **CP-01:** `seleccion=ok; puntos=7; cy_por_x=[280, 280, 280, 280, 280, 280, 280]; niveles_deducidos=[0,0,0,0,0,0,0]; mismo_nivel_mismo_cy=true; mayor_nivel_menor_cy=false; eje_y=["Sin riesgo", "Bajo", "Medio", "Alto"]`<br>**CP-05:** `seleccion=ok; ejeX=[x1=70, x2=784]; p1: x=70.00, pos_rel_medida=0.0000 (esperada=0.8864); ultimo_marcador: x=784.00, pos_rel_medida=1.0000 (esperada=0.9434)` |
| **iconos** | 885 intercambia `CORRECTO` e `INCORRECTO` | `Test Files 1 failed (1) \| Tests 2 failed \| 6 passed (8)` | **CP-03:** `seleccion=ok; valoraciones=4; textos_por_x=["✗", "✓", "◐", "○"]`<br>**CP-05:** `seleccion=ok; ejeX=[x1=70, x2=784]; p1: x=70.00, pos_rel_medida=0.0000 (esperada=0.8864); ultimo_marcador: x=784.00, pos_rel_medida=1.0000 (esperada=0.9434)` |
| **pendientes** | 885 devuelve `fecha_inferencia` de `p1, p2, p3` +1 h | `Test Files 1 failed (1) \| Tests 2 failed \| 6 passed (8)` | **CP-04:** `seleccion=ok; pendientes_medidos={p1: "10/10/26, 11:00 a. m.", p2: "10/10/26, 11:00 p. m.", p3: "11/10/26, 1:00 a. m."}; esperados_bogota={p1: "10/10/26, 10:00 a. m.", p2: "10/10/26, 10:00 p. m.", p3: "11/10/26, 12:00 a. m."}`<br>**CP-05:** `seleccion=ok; ejeX=[x1=70, x2=784]; p1: x=70.00, pos_rel_medida=0.0000 (esperada=0.8864); ultimo_marcador: x=784.00, pos_rel_medida=1.0000 (esperada=0.9434)` |
| **rango_completo** | 885 agrega dos eventos en `2025-11-20T06:00:00Z` y `2026-11-21T04:00:00Z` | `Test Files 1 failed (1) \| Tests 1 failed \| 7 passed (8)` | **CP-02:** `seleccion=ok; eventos=4; fills=["var(--danger-600, #dc2626)", "var(--danger-600, #dc2626)", "var(--danger-600, #dc2626)", "var(--danger-600, #dc2626)"]; max_error_pos_rel=N/A; x_ev2684=70.00, x_p2=703.92 (diff=633.92 px)` *(CP-05 pasa a OK con `pos_rel_medida=0.8865` y `0.9435`)* |
| **sin_mensaje** | 3001 devuelve `mensaje: null` | `Test Files 1 failed (1) \| Tests 2 failed \| 6 passed (8)` | **CP-05:** `seleccion=ok; ejeX=[x1=70, x2=784]; p1: x=70.00, pos_rel_medida=0.0000 (esperada=0.8864); ultimo_marcador: x=784.00, pos_rel_medida=1.0000 (esperada=0.9434)`<br>**CP-06:** `seleccion=ok; aviso_mensaje=false; sin_error=true; xAxis=true; yAxis=true; puntos=0; eventos=1; tvco="Sin datos suficientes para calcular"; tras Desde=2026-01-01: peticion_fecha_inicio=2026-01-01, aviso_sigue_visible=false` |
| **sin_aviso** | 3002 devuelve `fuentes_no_disponibles: []` | `Test Files 1 failed (1) \| Tests 2 failed \| 6 passed (8)` | **CP-05:** `seleccion=ok; ejeX=[x1=70, x2=784]; p1: x=70.00, pos_rel_medida=0.0000 (esperada=0.8864); ultimo_marcador: x=784.00, pos_rel_medida=1.0000 (esperada=0.9434)`<br>**CP-07:** `seleccion=ok; aviso_parcial=false; detalle_eventos=false (texto=""); puntos=7; valoraciones=4; eventos=0; sin_error=true` |

## Revisión de Claude (2026-11-20)

Spec revisado entero contra el prompt (SHA `52BA51CC…`); runner comparado con el de G019 (`543D1EEF…`): solo cambian el caso, 8 checkpoints, el spec, `formato.ts` en la lista de `src`, `TZ=America/Bogota` (y su limpieza) y la línea de zona del resumen. `src/` sin cambios. **Aprobado sin correcciones.**

- Los 8 checkpoints usan `intentarSeleccionar()`, registran lo medido y no tienen `expect`, `findBy` ni esperas con el valor esperado antes de `anotar()`. Los esperados salen de los datos fijos o se calculan aparte (CP-04 con `timeZone` explícito; CP-05 con aritmética propia sobre el rango en días de Bogotá).
- Precondición de zona (`Intl…timeZone === 'America/Bogota'`) y regla «precondición fallida = todo FALLA» presentes. 3001 trae el mensaje literal del backend (caso de uso :40).
- Edición 2 de Argon (filtrar `<li role="option">` del combobox al leer los pendientes): corrección legítima de la lectura; no toca esperados ni datos.
- En `rango_completo`, CP-02 da `max_error_pos_rel=N/A` porque asocia marcadores y horas por orden y solo compara con conteos iguales; con 4 eventos el checkpoint ya falla por el conteo, que es lo que pedía el control.
- Prueba de la herramienta (`prueba_herramienta_v2`): tres corridas idénticas con 7 OK y CP-05 FALLA (posiciones 0,0000 y 1,0000 frente a 0,8864 y 0,9434); cada control falla solo donde debe y con su obtenido real; en `rango_completo` CP-05 pasa a OK.
- **Desvío menor de Argon:** borró `evidencias/prueba_herramienta_v1/` (salida de la corrida que falló por el selector del eje Y, antes de detenerse). No era evidencia del producto.
