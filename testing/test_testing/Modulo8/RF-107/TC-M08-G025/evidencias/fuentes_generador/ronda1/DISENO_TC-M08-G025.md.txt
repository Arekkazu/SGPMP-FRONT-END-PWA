# Diseño de TC-M08-G025: mensajes de éxito y de error (RF-107)

**Casos:** TC-M08-061 (mensaje de éxito) y TC-M08-062 (mensaje de error con acción correctiva).
**Herramienta:** Vitest 4.1 con jsdom, usando la configuración de la raíz del frontend (`vite.config.ts` y `src/setupTests.ts`).
**Evaluador:** Juan Sebastian Gutierrez (QA SGPMP).
**Ronda:** 1 (evaluación).
**Fecha del diseño:** 19/11/2026.

## 1. Archivos

| Archivo | SHA-256 |
|---|---|
| `tc-m08-g025.test.tsx` | `D4D2AE4B7650547796FA0350E85E3E735168D7997871D4A7BC85A286E3F72A7D` |
| `ejecutar_tc_m08_g025.ps1` | `9DB425902DF7A1D13F4042F29E89C7E84EF95A28677231F3B77E2635BA9DC1CD` |

El runner es para PowerShell 5.1: ASCII puro, sin BOM y con fin de línea CRLF.

**Comando (una sola corrida, sin `--retry`):**

```
pnpm exec vitest run testing/test_testing/Modulo8/RF-107/TC-M08-G025/tc-m08-g025.test.tsx --reporter=verbose
```

**Salida:** `evidencias\run-<yyyyMMdd-HHmmss>\`, con estos archivos:

- `resultado_TC-M08-G025.json`
- `checkpoints_TC-M08-G025.txt`
- `consola_TC-M08-G025.txt`
- `escaneo_secretos_TC-M08-G025.txt`
- `resumen_TC-M08-G025.txt`

En un reintento, cada nombre lleva el sufijo `_reintentoN`.

**Datos:** solo respuestas simuladas.

- La prueba no llama a TEST.
- No usa sandbox ni credenciales.

## 2. Interpretación del requerimiento

1. **Qué versión manda.**
   - La celda de Descripción del RF-107 trae una versión anterior completa: sus Entradas con `mensaje_tecnico`, su Proceso, FA-1 a FA-7 y CA-1 a CA-12.
   - Las filas vigentes la reemplazan: Entradas (R121 a R131), Proceso 8.1 a 8.5 (R132) y CA-01 a CA-16 (R136).
   - La fila de Flujo alterno (R133) está vacía. Por eso los FA de la Descripción siguen vigentes solo cuando la sección 8.5 los nombra.
2. **Plantilla de éxito.** La sección 8.5 dice que las plantillas son fijas por tipo de acción.
   - REGISTRO_ACTIVO: «El activo [identificador] fue registrado correctamente. Valor inicial reconocido: $[monto] COP.» (coincide con el ejemplo del Tipo 1).
   - CIERRE_PERIODO: «El período [periodo] fue cerrado correctamente. [N] activos fueron revaluados.»
   - La redacción «Valor inicial: [monto].» es de la versión anterior y no se usa.
3. **Qué se prueba.**
   - `datos_contexto` es un contrato abstracto y no se exige con esos nombres.
   - Se prueba lo que el usuario ve en pantalla, ejecutando el código real con la respuesta del backend simulada.
4. **Responsable de los datos.** El backend entrega los datos que piden las plantillas:
   - el registro devuelve `identificador` y `costo_adquisicion`;
   - el cierre devuelve `activos_procesados` (`ejecutar_cierre_periodo_use_case.py`:524-530 y `types.ts` `ResultadoCierre`).

   Si el texto no aparece, la responsabilidad es del frontend.
5. **Clave fuera del catálogo (decisión del evaluador del 19/11/2026).**
   - Se sigue el criterio de Desarrollo: la v7 dice que el catálogo tiene prioridad sobre el texto del servidor, y `catalogoErrores.ts` usa el texto del servidor cuando la clave no está.
   - La diferencia con la sección 8.5 y FA-2, que piden el mensaje genérico, queda como observación.
6. **Catálogo sembrado en TEST** (migración `a7c3e91f5b20`, filas es-CO):
   - Hay 5 claves.
   - Solo `PERIODO_NO_CERRADO` tiene botón: «Ir al cierre de período», que lleva a `finanzas`.
   - `ERROR_ESPECIE_INACTIVA` no existe.

## 3. Qué código se ejecuta

El código de `src/` no se modifica.

- **CP-01, CP-03, CP-04, CP-05 y CP-06:** el registro de un activo.
  - Cadena: `useActivos().registrar` → `activosApi.registrar` → `http` → `avisarExito` → `ToastHost` / `Alert`.
- **CP-02:** el cierre completo en `CierreView`.
  - Se montan `AuthContext` con los permisos `cierre_periodo` R y E, `ProveedorPeriodo` y `CierreView`.
  - Se pulsa «Cerrar período» y luego el botón del modal.
  - El POST del cierre devuelve `activos_procesados` = 120 y 3 comprobantes.
- **CP-07 a CP-11:**
  - El catálogo se carga con `cargarCatalogoErrores(http, 'es-CO')`.
  - `reportesApi.generar` falla y el interceptor de `http` llama a `mapToApiError`.
  - El error se muestra con la misma línea de `HistorialPredictivoView.tsx`:114:

    ```
    pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion })
    ```

    El spec comprueba que esa línea sigue igual en el código; si cambió, la corrida es inválida.
- **Red:** se simula con el adaptador del mismo cliente `http` de la app.
- **Cuerpos de error:** son los del backend (`src/shared/error_handlers.py`: `error_code`, `message`, `fields`, `timestamp`), con códigos y textos copiados del código.

## 4. Checkpoints

| CP | Caso | Esperado | Fuente | Previsto |
|---|---|---|---|---|
| CP-01 | 061 a | «El activo BOV-2024-001 fue registrado correctamente. Valor inicial reconocido: $1.639.000 COP.» | 8.5, Tipo 1, CA-09 | FALLA: se ve «Registrado correctamente BOV-2024-001» |
| CP-02 | 061 b | «El período [periodo] fue cerrado correctamente. 120 activos fueron revaluados.» | 8.5, CA-09 | FALLA: se ve «Período … cerrado. Se generaron 3 comprobantes.» |
| CP-03 | 061 | Banner de éxito (`ds-alert--success`, verde) con ícono de check y `role=alert` | Tipo 1 | OK |
| CP-04 | 061 (límite) | Visible a los 4,999 s y oculto a los 5,000 s | Tipo 1; 8.2 nivel 4 | OK |
| CP-05 | 061 c | Se cierra al pulsar a los 2 s | Tipo 1 | OK |
| CP-06 | 061 d | Un segundo éxito a los 3 s deja un solo banner, con el mensaje nuevo; visible a los 7,999 s y oculto a los 8,000 s | 8.3 unicidad; 8.2 nivel 4 | OK |
| CP-07 | 062 a | `PERIODO_NO_CERRADO`: banner rojo con ícono de error, el texto del catálogo y no el del servidor, y el botón «Ir al cierre de período», que lleva a `/finanzas` | 8.5 FALLIDO; Tipo 2; catálogo | OK |
| CP-08 | 062 b | `OPERACION_DUPLICADA`: el texto del catálogo y ningún botón | 8.5; catálogo | OK |
| CP-09 | 062 c | `PERIODOS_FUERA_DE_ORDEN` (no está en el catálogo): el texto del servidor, sin clave ni código y sin botón | Decisión del evaluador (criterio de Desarrollo); Restricción 1; CA-02 | OK |
| CP-10 | 062 e | 422 `REPORTE_EN_PROCESO`, 404 `PERIODO_INEXISTENTE`, 409 `CIERRE_NO_CANCELABLE` y 500 `ERROR_INTERNO`: texto en lenguaje natural, sin códigos HTTP, términos técnicos, la clave cruda ni «[object Object]» | Restricción 1; CA-02; Tipo 2 | OK |
| CP-11 | 062 f | El banner de error sigue visible a los 10 s y a los 60 s, y se cierra al pulsar | Tipo 2 | OK |

## 5. Observaciones (no cuentan)

- **OBS-d (062 d):** error sin clave.
  - La especificación no dice qué mostrar.
  - Se mide con un 502 sin cuerpo y se compara con el texto de FA-2.
- **OBS-g (062 g):** clave con `es_activo = false`.
  - La especificación no define qué significa una clave inactiva.
  - Se mide qué texto y qué botón se muestran.
- **OBS-FA5 (061 e):** éxito con advertencias.
  - Las Entradas vigentes no tienen ningún campo para las advertencias y la sección 8.5 no tiene esa rama.
  - No se prueba.
- **OBS-CA01 y posición:** jsdom no mide el tiempo (500 ms o menos) ni la posición. El tiempo se cubre en TC-M08-073 (G030).
- **OBS-FA2:** la diferencia documentada entre el criterio de Desarrollo y la sección 8.5 / FA-2 (ver 2.5).
- **OBS-alcance:**
  - El error al registrar un activo se muestra dentro del formulario, no en el banner de M08.
  - Hoy solo `HistorialPredictivoView` y `ReportesPage` usan el banner de error con botón.

## 6. Validación de la herramienta (19/11/2026)

**Entorno:** se probó en el contenedor de Claude, con una copia de `src/` del frontend (SHA del paquete `a4cdc71b…`), pnpm install y Vitest 4.1.11.

**Corrida contra el código actual:** 9 OK y 2 FALLA (CP-01 y CP-02), igual a lo previsto. El exit de Vitest fue 1.

**Controles por mutación sobre la copia** (el código del repositorio no se tocó). Cada mutación cambia solo los checkpoints que debe cambiar:

| Mutación | Resultado |
|---|---|
| M1: plantilla de REGISTRO implementada | CP-01 pasa a OK |
| M2: plantilla de CIERRE implementada | CP-02 pasa a OK |
| M3: el éxito dura 6 s | CP-04 y CP-06 pasan a FALLA |
| M4: el catálogo pierde la prioridad | CP-07 y CP-08 pasan a FALLA |
| M5: el error se cierra solo a los 8 s | CP-11 pasa a FALLA |
| M6: los éxitos se apilan | CP-06 pasa a FALLA |
| M7: el 500 muestra «Error 500: ERROR_INTERNO» | CP-10 pasa a FALLA |

**Tipos:** `tsc` sobre el spec con el `tsconfig` del proyecto no da errores propios. Solo faltan los tipos de Node (`@types/node` no está en el proyecto), y eso no afecta a Vitest.

**PowerShell:** no se pudo ejecutar aquí. El agente valida el runner con `Parser::ParseFile` (0 errores) antes de correrlo.
