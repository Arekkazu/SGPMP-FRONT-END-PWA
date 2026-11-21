# Diseño de TC-M08-G019: visualización del historial predictivo y validación clínica (RF-106)

## Historial de cambios

| Fecha | Autor | Descripción |
|---|---|---|
| 2026-11-20 | Juan Sebastian Gutierrez | Fase 1 (Claude) y Fase 2 (Argon): spec Vitest y runner |
| 2026-11-20 | Juan Sebastian Gutierrez | v1.1 del spec (revisión de Claude): espera de estabilidad, obtenido real, sin "No alcanzado" por esperas, precondición fallida = todo FALLA |
| 2026-11-20 | Juan Sebastian Gutierrez | v1.2 del spec (revisión de Claude): un acceso denegado en CP-01, CP-02 y CP-04 da FALLA con obtenido real |

---

## 1. Casos cubiertos y justificación

- **Casos:** TC-M08-048 (Acceso al historial predictivo), TC-M08-049 (Rango de fechas del historial predictivo) y TC-M08-050 (Filtros del historial predictivo).
- **Requerimiento:** RF-106 (Visualización del historial predictivo y validación clínica).
- **Herramienta:** Vitest 4.1 con jsdom, bajo la configuración del frontend (`vite.config.ts`, `src/setupTests.ts`).
- **HEAD del frontend bajo prueba:** `3358b032`.
- **Justificación de Vitest con respuestas simuladas:**
  - Los casos evalúan el comportamiento funcional del frontend ante permisos de acceso, control de rangos de fechas (con cálculo de calendario congelado en 2026-11-20) y filtros de visualización de eventos, retroalimentaciones, niveles de riesgo y modo lineal/agrupado.
  - La suite sustituye el adaptador HTTP de Axios (`http.defaults.adapter`) por un adaptador determinista en memoria que replica la forma exacta de `consultar_historial_predictivo_use_case.py`. Esto permite aislar la prueba de la base de datos y de la red, garantizando reproducibilidad y control de mutaciones sin alterar el código fuente de `src/`.

---

## 2. Especificación funcional (Fase 1 - Claude)

1. **Permisos y roles (TC-M08-048):**
   - **Veterinario:** Posee el permiso `['historial_clinico_predictivo', ACCION_R]` (`id_accion: 2`). Tiene acceso completo: la pestaña «Historial predictivo» es visible, selecciona activos (en estado `ACTIVO` o `EN_TRATAMIENTO`), se consulta `GET /historial-predictivo/{id}` y se visualizan la TVCO, los puntos de la línea temporal, los marcadores de eventos y valoraciones, y el listado de predicciones pendientes con el botón «Registrar retroalimentación».
   - **Productor:** Según RF-106 Restricción 1 y CA-6, no tiene acceso al historial predictivo detallado. No ve la pestaña; si navega a la ruta directamente, se renderiza la vista de acceso denegado (`<AccesoDenegado seccion="Historial predictivo" />`), no se envía ninguna petición HTTP a `/historial-predictivo/` y no se muestra el combobox de selección de activo ni ninguna métrica de TVCO.
   - **Administrador:** En la entrega de software v7 y según la migración `a7c3e91f5b20:72-73`, el Administrador cuenta con el permiso de lectura del historial clínico predictivo. Carga la vista igual que el Veterinario.
2. **Rango de fechas (TC-M08-049):**
   - **Rango por defecto:** Fecha fin = hoy (2026-11-20); fecha inicio = exactamente 12 meses antes (2025-11-20). La consulta se realiza automáticamente al seleccionar el activo.
   - **Subrango de 24 meses:** Según Restricción 2, el Veterinario puede seleccionar un subrango de hasta 24 meses. Al fijar Desde = 2024-11-20 y Hasta = 2026-11-20, el backend devuelve 200 y se grafican todos los puntos correspondientes a ese período (8 inferencias).
   - **Límite de 24 meses + 1 día:** Según el Swagger oficial de TEST, consultas que exceden 24 meses devuelven HTTP 400 con código `VAL_ENTRADA` («El rango máximo de consulta es de 24 meses»). El frontend maneja este error mostrando una alerta de error («No se pudo cargar el historial») con el mensaje de 24 meses, no dibuja la línea de tiempo (0 puntos) y mantiene los campos de fecha habilitados para permitir rectificar el subrango sin recargar la página.
   - **Hallazgo i18n:** Falta la clave `common:errores.por_codigo.VAL_ENTRADA` en es-CO (muestra fallback en español).
3. **Filtros (TC-M08-050):**
   - **Eventos sanitarios:** Checkbox «Eventos sanitarios». Al desmarcarlo se envía `incluir_eventos_sanitarios=false`, ocultando los rombos de eventos en la gráfica.
   - **Retroalimentaciones:** Checkbox «Retroalimentaciones». Al desmarcarlo se envía `incluir_retroalimentacion=false`, ocultando los marcadores de valoración clínica.
   - **Niveles de riesgo:** Cuatro casillas: Sin riesgo (0), Bajo (1), Medio (2), Alto (3). Se serializan en la query string repitiendo la clave sin corchetes ni índices (`indexes: null`), produciendo `nivel_riesgo=2&nivel_riesgo=3`.
   - **Modo Lineal vs. Agrupado:** Radio buttons «Lineal» y «Agrupada». Al seleccionar «Agrupada» se envía `modo_visualizacion=AGRUPADO` y se muestra en pantalla la tarjeta de «1 grupo de eventos cercanos».

---

## 3. Decisiones tomadas

1. **CP-04 (Administrador con lectura):** Se sigue el comportamiento real del sistema entregado en v7 (migración `a7c3e91f5b20`), donde el Administrador tiene permiso de lectura del historial. Se documenta como hallazgo y observación (OBS-5) frente a RF-106 Restricción 1 y CA-6 para decisión de los líderes de proyecto.
2. **CP-07 (Respuesta 400 del Swagger):** El requerimiento funcional habla del límite de 24 meses y el Swagger de TEST documenta el error 400 con `VAL_ENTRADA`. Se valida la resiliencia del frontend ante esta respuesta del servidor.
3. **OBS-1 (Ausencia de atributo min en fecha):** El input `#hp-desde` no tiene restricción `min` a nivel de HTML, permitiendo que la fecha con más de 24 meses viaje al servidor.

---

## 4. Tabla de checkpoints (13)

| CP | Caso | Condición evaluada | Resultado esperado | Fuente |
|---|---|---|---|---|
| **CP-01** | TC-M08-048 | Veterinario con activo ACTIVO (885) | Pestaña visible; consulta GET `/historial-predictivo/885`; TVCO «25% (4 validadas)»; 6 puntos en la línea; 3 marcadores de evento; 4 de valoración; 2 pendientes con botón «Registrar retroalimentación»; sin alerta de acceso denegado. | RF-106 Restricción 1; CA-6; Precondición 2 |
| **CP-02** | TC-M08-048 | Veterinario con activo EN_TRATAMIENTO (2945) | Igual que CP-01 con GET `/historial-predictivo/2945`. | RF-106 Precondición 2; Restricción 1 |
| **CP-03** | TC-M08-048 | Productor | Sin pestaña «Historial predictivo»; ruta muestra «No tienes acceso a esta sección» y «Historial predictivo»; 0 peticiones a `/historial-predictivo/`; sin combobox ni TVCO. | RF-106 Restricción 1; CA-6 |
| **CP-04** | TC-M08-048 | Administrador | Igual que CP-01 (la vista carga con lectura). | Entrega v7; migración `a7c3e91f5b20:72-73` |
| **CP-05** | TC-M08-049 | Rango por defecto | Petición lleva `fecha_inicio=2025-11-20` y `fecha_fin=2026-11-20`; inputs Desde y Hasta muestran esas fechas. | RF-106 Entradas |
| **CP-06** | TC-M08-049 | Rango de 24 meses exactos | Desde=2024-11-20; petición con `fecha_inicio=2024-11-20` y `fecha_fin=2026-11-20`; respuesta 200; 8 puntos en la línea; sin error. | RF-106 Restricción 2 |
| **CP-07** | TC-M08-049 | Rango de 24 meses + 1 día | Desde=2024-11-19; backend 400; 0 puntos en la línea; aviso «No se pudo cargar el historial» con texto «24 meses»; campos Desde/Hasta habilitados; retorno a subrango válido restaura 6 puntos sin error. | RF-106 Restricción 2; Swagger de TEST |
| **CP-08** | TC-M08-049 | Cambio de rango sin recargar | Cambio a Desde=2026-08-20; petición con `fecha_inicio=2026-08-20`; TVCO pasa a «33% (3 validadas)»; total pasa a «4 predicciones»; línea a 4 puntos; el combobox es el mismo nodo del DOM (`===`) con el mismo valor; ruta no cambia. | RF-106 CA-10 |
| **CP-09** | TC-M08-050 | Sin eventos sanitarios | Desmarcar «Eventos sanitarios»; petición con `incluir_eventos_sanitarios=false`; 0 marcadores de evento y 4 de valoración. | RF-106 Entradas |
| **CP-10** | TC-M08-050 | Sin retroalimentación | Desmarcar «Retroalimentaciones»; petición con `incluir_retroalimentacion=false`; 0 marcadores de valoración y 3 de evento. | RF-106 Entradas |
| **CP-11** | TC-M08-050 | Solo nivel 3 | Desmarcar Sin riesgo, Bajo y Medio; petición con `nivel_riesgo=3` una sola vez; 2 puntos en la línea. | RF-106 Entradas |
| **CP-12** | TC-M08-050 | Niveles 2 y 3 | Desmarcar Sin riesgo y Bajo; petición con `nivel_riesgo=2&nivel_riesgo=3`; 4 puntos en la línea. | RF-106 Entradas |
| **CP-13** | TC-M08-050 | Lineal y Agrupado | En Lineal 6 puntos y sin grupos; en Agrupada petición con `modo_visualizacion=AGRUPADO`, 6 puntos y tarjeta «1 grupo de eventos cercanos». | RF-106 Entradas |

---

## 5. Tabla de observaciones

| ID | Texto literal / Descripción |
|---|---|
| **OBS-1** | `OBS-1: en CP-07, peticion con fecha_inicio=2024-11-19 salio al servidor: SI; atributo min de #hp-desde: null` |
| **OBS-2** | `OBS-2: con los 4 niveles desmarcados: parámetros nivel_riesgo: []; puntos en la línea: 6` |
| **OBS-3** | `OBS-3: en CP-09, el texto del total de eventos sanitarios después de ocultarlos: "3 eventos sanitarios"` |
| **OBS-4** | `OBS-4: la respuesta no trae filtros_aplicados ni activo_seleccionado (forma real del backend; G018 OBS-NOMBRES); lo aplicado se refleja en los controles.` |
| **OBS-5** | `OBS-5: Administrador con lectura (CP-04) frente a RF-106 Restricción 1 y CA-6: decisión de Sebastian 2026-11-20 de seguir la entrega v7; para los líderes.` |

> **Nota para el caso futuro G020:** El eje X de la gráfica va del primer al último dato registrado (`domain: ['dataMin', 'dataMax']`, en `HistorialPredictivoView.tsx:233`), no del rango de fechas elegido en los filtros (Proceso 3).

---

## 6. Datos simulados y selectores del DOM

### Conjunto de datos simulados
- **Activos:**
  - `QA-885 · Bovino` (id: 885, estado: ACTIVO).
  - `QA-2945 · Bovino` (id: 2945, estado: EN_TRATAMIENTO).
- **Predicciones (8 inferencias en total):**
  - `p1` (2024-11-25, nivel 1, 24 meses exactos).
  - `p2` (2025-05-10, nivel 2, fuera del rango 12m).
  - `p3` a `p8` (2025-11-25 a 2026-11-15, en el rango por defecto de 12 meses):
    - `p3`: 2025-11-25, nivel 3 (0.82), con retroalimentación r1 (CORRECTO).
    - `p4`: 2026-02-14, nivel 1 (0.28), con retro r2 (INCORRECTO).
    - `p5`: 2026-04-18, nivel 0 (0.05), con retro r3 (INCORRECTO).
    - `p6`: 2026-08-25, nivel 2 (0.64), con retro r4 (DUDA).
    - `p7`: 2026-10-12, nivel 3 (0.88), pendiente de evaluar.
    - `p8`: 2026-11-15, nivel 2 (0.55), pendiente de evaluar.
- **Eventos sanitarios (3 eventos):**
  - `e1`: 2026-03-01 (Vacunación antiaftosa).
  - `e2`: 2026-06-15 (Tratamiento mastitis).
  - `e3`: 2026-10-20 (Control parasitario).
- **Retroalimentaciones (4 evaluaciones):** `r1` a `r4` asociadas a `p3`–`p6`.

### Selectores de elementos en la gráfica Recharts
- **Puntos de la línea de tiempo:** `document.querySelectorAll('.recharts-line-dots circle')`
- **Marcadores de eventos sanitarios (rombo):** `document.querySelectorAll('.recharts-scatter-symbol path')`
- **Marcadores de valoración clínica (texto C / E / D):** `document.querySelectorAll('.recharts-scatter-symbol text')`

---

## 7. Prueba de la herramienta

### 7.1 Corrida normal (4.1)
- **Resultado:** 13 passed de 13 tests.
- **Exit code:** 0.
- **Resumen:** `Test Files 1 passed (1) | Tests 13 passed (13)`.

### 7.2 Controles por mutación (4.2)

| Control | Mutación aplicada | Resultado esperado | Resultado obtenido |
|---|---|---|---|
| **permiso_admin** | Se retira el permiso `historial_clinico_predictivo` al Administrador. | Falla únicamente CP-04. | `Test Files 1 failed (1) \| Tests 1 failed \| 12 passed (13)`<br>Falla CP-04 (`sin_pestana=true; sin_acceso_titulo=true; ...`). |
| **rango_200** | La respuesta simulada devuelve 200 con 9 puntos para 24 meses + 1 día en vez de 400. | Falla únicamente CP-07. | `Test Files 1 failed (1) \| Tests 1 failed \| 12 passed (13)`<br>Falla CP-07 (`con 24m+1d: puntos=9, titulo_error=false, ...`). |
| **niveles** | La respuesta simulada devuelve siempre todas las predicciones ignorando el filtro `nivel_riesgo`. | Fallan únicamente CP-11 y CP-12. | `Test Files 1 failed (1) \| Tests 2 failed \| 11 passed (13)`<br>Falla CP-11 (`puntos=6`) y CP-12 (`puntos=6`). |
| **eventos** | La respuesta simulada devuelve siempre los 3 eventos sanitarios ignorando `incluir_eventos_sanitarios=false`. | Falla únicamente CP-09. | `Test Files 1 failed (1) \| Tests 1 failed \| 12 passed (13)`<br>Falla CP-09 (`eventos=3; retros=4`). |
| **tvco_fija** | La respuesta simulada devuelve siempre TVCO fija de 25% (4 validadas), ignorando el subrango de fechas. | Falla únicamente CP-08. | `Test Files 1 failed (1) \| Tests 1 failed \| 12 passed (13)`<br>Falla CP-08 (`No alcanzado` al no encontrar «33% (3 validadas)»). |

## Revisión de Claude: spec v1.1 (2026-11-20)

Revisado el spec v1 de Argon (SHA `C3CB2561…`) contra el prompt: datos simulados, límite de 24 meses por calendario, permisos, precondiciones y conteos correctos; `src/` sin cambios. Se corrigió en el equipo (spec v1.1, SHA `EC980DCB…`, sintaxis verificada con esbuild):

1. **Lectura inestable de la gráfica.** El control `rango_200` midió 9 puntos con 8 predicciones: los conteos se tomaban apenas desaparecía «Cargando historial...» y recharts puede redibujar después. Se agregó `esperarEstable()`: tras la carga, la firma de pantalla (puntos, eventos, valoraciones, TVCO y aviso de error) debe repetirse en dos lecturas seguidas separadas 50 ms (máximo 3 s). No depende de ningún esperado.
2. **Obtenido copiado del esperado.** CP-01, CP-02, CP-04 y CP-08 registraban `present=true/false`; ahora registran el texto real de la TVCO (`leerTvco()`) y del total (`leerTotalInferencias()`).
3. **Checkpoints que podían quedar «No alcanzado».** Se quitaron `findByText` con el valor esperado (CP-07 y CP-08) y los `expect` previos a `anotar` (CP-08, CP-09 y CP-10); los valores «antes» entran en el obtenido y en la condición del checkpoint.
4. **Precondiciones.** Si alguna falla (o no se evaluó ninguna), todos los checkpoints pasan a FALLA con «Precondición no cumplida (…)» y el valor medido.

La prueba de la herramienta de la v1 (`evidencias/prueba_herramienta_v1/`) queda como historial; la de la v1.1 va en `evidencias/prueba_herramienta_v2/`.

## Prueba de la v1.1 y spec v1.2 (2026-11-20)

- Prueba de la v1.1 (`evidencias/prueba_herramienta_v2/`, Argon, revisada contra los JSON): tres corridas normales con 13/13 OK e idénticos obtenidos (estable). Controles: `rango_200` → solo CP-07 (ahora 8 puntos: confirma que el 9 de la v1 era una lectura a medio redibujar); `niveles` → solo CP-11 y CP-12; `eventos` → solo CP-09; `tvco_fija` → solo CP-08 con la TVCO real; `permiso_admin` → solo CP-04, pero como «No alcanzado».
- **Spec v1.2** (SHA `842A5CB2…`, sintaxis verificada con esbuild): en CP-01, CP-02 y CP-04 la selección del activo pasa por `intentarSeleccionar()`, que devuelve el error en vez de lanzarlo; el obtenido lo registra (`seleccion=…`) y el checkpoint da FALLA. Sin esto, un acceso denegado real dejaría el checkpoint «No alcanzado» y el runner declararía la corrida inválida (exit 3) en lugar de Rechazado. Prueba en `evidencias/prueba_herramienta_v3/`.
