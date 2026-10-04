# TC-M09-G07 — Reevaluación V3 (RF-15, Issue #115)

**Fecha:** 2026-09-24  
**Responsable QA:** Sebastian  
**Entorno Frontend:** TEST oficial (`https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`)  
**Entorno Backend:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`  
**Herramienta:** Cypress 13 + Newman CLI  
**Navegador:** Electron 118.0.5993.159 (Headless)  
**Trazabilidad de Petición Inicial:** `POST /configuracion/especies` -> HTTP 500 (`ERROR_INTERNO`)  
**Veredicto:** **RECHAZADO**  
**Reporte computable:** `resultados/resultado_TC-M09-G07_reintento2.json`  

---

## 1. Contexto y motivo de la reevaluación

El caso de prueba **`TC-M09-G07`** (asociado a la regla de negocio **`RF-15`**: *Sincronización Offline y Resolución de Conflictos en Catálogo de Especies*) fue objeto de reevaluación formal tras el cierre preliminar por parte del equipo de Desarrollo del **Issue #115 (`INC-M09-06-07`)**.

El defecto original consistía en que la interfaz de usuario bloqueaba completamente el botón *"Nueva especie"* en ausencia de conexión (`disabled={!online}`), impidiendo el cumplimiento del paradigma *Offline-First* de la PWA. Asimismo, no existía soporte para registrar operaciones diferidas de creación en la cola de sincronización de IndexedDB (Dexie), ni un mecanismo explícito para capturar colisiones de nombres (`HTTP 409 Conflict`) al reanudar la conectividad.

El equipo de Desarrollo reportó una solución integral articulada en 6 cambios clave (puntos **a** al **f**), comprometiendo la habilitación de la escritura desconectada, la asignación de identificadores temporales negativos, el badge informativo en la tabla, el marcado de operaciones en conflicto en Dexie y la incorporación de una alerta con el botón *"Descartar"*.

---

## 2. Estructura del caso (post-reorganización)

Siguiendo la normativa institucional de aseguramiento de calidad (R15 y Guía Canónica de Casos de Prueba), se reorganizó la carpeta del caso para asegurar que la herramienta de escaneo automático (`scanner.py`) detecte los resultados sin necesidad de compensaciones manuales.

```text
SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/
├── .env.test                                  # Configuración de variables TEST (ignorado en git)
├── .env.test.example                          # Plantilla para QA sin credenciales sensibles
├── .gitignore                                 # Exclusiones locales de entorno y logs
├── .gitkeep                                   # Preservación de estructura en VCS
├── commands.ts                                # Comandos bilingües y utilidades de red
├── cypress.config.js                          # Configuración oficial Cypress 13 (dotenv + retries: 2)
├── package.json                               # Dependencias del caso (Cypress, Newman, Dotenv)
├── tsconfig.json                              # Configuración TypeScript aislada
│
├── cypress/                                   # Especificaciones Cypress E2E
│   └── tc-m09-g07-sincronizacion-offline.cy.ts # Spec principal reactivo
│
├── postman/                                   # Colección y runner de contratos API
│   ├── .gitkeep
│   ├── TC-M09-G07.postman_collection.json     # Colección Postman v2.1.0
│   └── run_newman_tc_m09_g07.js               # Runner Newman CLI
│
├── resultados/                                # [Carpeta computable escaneada por scanner.py]
│   ├── resultado_TC-M09-G07.json              # Corrida V1 original
│   ├── resultado_TC-M09-G07_reintento1.json   # Reevaluación V2 previa
│   └── resultado_TC-M09-G07_reintento2.json   # Reevaluación V3 oficial (vigente)
│
└── evidencias/                                # Documentación narrativa y multimedia
    ├── TC-M09-G07_reevaluacion_V3.md           # [ÚNICO informe narrativo consolidado]
    ├── v1-run-20260905/                       # Histórico V1
    ├── v2-reeval-20260912/                    # Histórico V2
    ├── v3-reeval-20260924/                    # Histórico V3 (screenshots, video, postman)
    ├── screenshots/                           # Destino del runner (.gitkeep)
    └── videos/                                # Destino del runner (.gitkeep)
```

---

## 3. Verificación de los cambios de Desarrollo (a–f)

Se realizó una auditoría estática exhaustiva en el código fuente de la aplicación (`SGPMP-FRONT-END-PWA/src/`):

| Punto | Requerimiento de Desarrollo | Estado | Archivo Fuente | Evidencia Textual |
|---|---|:---:|---|---|
| **(a)** | En modo offline, `useEspecies.registrar()` encola con `tempId < 0` y `pendienteSync: true`. En online, petición API normal. | **APLICADO** | `src/configuration/hooks/useEspecies.ts` (L. 83-97) | ```typescript if (!navigator.onLine) { const tempId = -Date.now(); await enqueue(MODULO, 'crear', { tempId, dto }); setEspecies((prev) => [...prev, { id_especie: tempId, nombre: dto.nombre, ..., pendienteSync: true }]); return true; } ``` |
| **(b)** | `syncQueue.replay()` marca `conflicto: true` ante respuestas 4xx (excepto 401). | **APLICADO** | `src/shared/sync/syncQueue.ts` (L. 76-83) | ```typescript const status = (e as { status?: unknown } | null)?.status; if (typeof status === 'number' && status >= 400 && status < 500 && status !== 401) { await db.syncQueue.update(op.id, { conflicto: true, error: (e as any)?.message }); } ``` |
| **(c)** | Función `getConflictos(modulo?)` expuesta en `syncQueue.ts`. | **APLICADO** | `src/shared/sync/syncQueue.ts` (L. 36-39) | ```typescript export async function getConflictos(modulo?: string): Promise<SyncOperation[]> { const conflictos = await db.syncQueue.filter((op) => op.conflicto === true).toArray(); return modulo ? conflictos.filter((op) => op.modulo === modulo) : conflictos; } ``` |
| **(d)** | `useEspecies.resolverConflicto(op)` implementado para remover de cola y de la UI. | **APLICADO** | `src/configuration/hooks/useEspecies.ts` (L. 111-119) | ```typescript const resolverConflicto = useCallback(async (op: SyncOperation): Promise<void> => { if (op.id === undefined) return; await removeFromQueue(op.id); if (op.accion === 'crear') { const { tempId } = op.payload as any; setEspecies((prev) => prev.filter((e) => e.id_especie !== tempId)); } await cargarConflictos(); }, [cargarConflictos]); ``` |
| **(e)** | Botón *"Nueva especie"* habilitado offline y renderizado de alerta de conflictos con botón *"Descartar"*. | **APLICADO** | `src/configuration/pages/ConfigurationPage.tsx` (L. 153, 191-203) | ```tsx <Button ... onClick={() => setModal({ tipo: 'crear' })}> {t('configurationpage.nueva_especie')} </Button> ... {conflictos.map((op) => ( ... <Button onClick={() => resolverConflicto(op)}> {t('configurationpage.descartar')} </Button> ))} ``` |
| **(f)** | Ocultamiento de botones de acción (Editar/Desactivar) en filas con `pendienteSync`. | **APLICADO** | `src/configuration/components/EspeciesTable.tsx` (L. 118-120) | ```tsx {!especie.pendienteSync ? ( <> <IconButton ... aria-label="Editar especie" /> <IconButton ... aria-label="Desactivar especie" /> </> ) : ( <span style={{ color: 'var(--text-muted)' }}>—</span> )} ``` |

---

## 4. Ejecución Newman (contratos backend TEST)

**Comando:** `node postman/run_newman_tc_m09_g07.js`  
**Host evaluado:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test`

| Request | HTTP Esperado | HTTP Obtenido | Estado | Detalle |
|---|:---:|:---:|:---:|---|
| `01 - Iniciar Sesión Administrativa` | 200 / 201 | 200 OK | **OK** | Credenciales institucionales válidas; token JWT obtenido. |
| `02 - Registro Base de Especie (Online)` | 201 / 200 | 201 Created | **OK** | **D1 RESUELTO**: Especie registrada con éxito en backend TEST (ID #57 asignado). |
| `03 - Rechazo de Especie Duplicada` | 409 / 422 | 409 Conflict | **OK** | **Contrato real verificado**: Backend rechaza duplicidad con HTTP 409 y mensaje de unicidad. |
| `04 - Teardown: Desactivar Especie Creada` | 200 | 200 OK | **OK** | Especie #57 desactivada exitosamente en el servidor (HTTP 200). |

---

## 5. Ejecución Cypress (flujo E2E UI)

**Comando:** `npx cypress run --spec cypress/tc-m09-g07-sincronizacion-offline.cy.ts --browser electron`  
**Intentos ejecutados:** 3 intentos en modo headless (`retries: { runMode: 2 }`).  
**Ediciones de archivos durante la corrida:** **NO** (Regla R14 respetada estrictamente).

| CP | Descripción | Estado | Evidencia Concreta |
|---|---|:---:|---|
| **CP-1** | Precondición de conflicto (Especie base online en servidor) | **OK** | **D1 resuelto tras fix Alembic**: Backend TEST responde HTTP 201 Created con ID asignado y HTTP 409 en duplicado. |
| **CP-2** | Habilitación de botón Nueva especie en modo offline (RF-15) | **OK** | El botón *"Nueva especie"* permanece interactivo sin conexión (`disabled={!online}` eliminado). Evidencia: `01_ui_offline_habilitado.png`. |
| **CP-3** | Registro local optimista y badge de sincronización pendiente | **OK** | Fila optimista creada con ID temporal negativo y badge visible tras filtrar por nombre en catálogo paginado. Evidencia: `02_registro_optimista_pendiente.png`. |
| **CP-4** | Detección de conflicto 409 y despliegue de alerta con opción Descartar | **FALLA** | **Defecto D2 persistente**: Backend real retornó HTTP 409 y Dexie guardó `conflicto: true`, pero `useEspecies` carece de reactividad a eventos de sincronización y la alerta nunca se renderizó (timeout 20s). |
| **CP-5** | Resolución manual de conflicto y limpieza de operación en cola | **FALLA** | No ejecutable: bloqueado por la falta de despliegue de la alerta y opciones de resolución en CP-4. |

---

## 6. Reporte computable final

- **Destino normativo:** `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/resultados/resultado_TC-M09-G07_reintento2.json`
- **Total de checkpoints:** 5
- **Passed:** 3 (CP-1, CP-2, CP-3)
- **Failed:** 2 (CP-4, CP-5)
- **Estados anómalos (OBSERVACION, vacíos, lowercase):** 0
- **Veredicto computable escaneable:** **RECHAZADO**

---

## 7. Teardown y estado de la base de datos

- **Consulta a la API de TEST (`GET /configuracion/especies`):** Retorna **HTTP 200 OK** con 27 registros existentes.
- **Especies creadas en backend durante la prueba:** 1 especie creada en la verificación base (#57).
- **Especies desactivadas vía API:** 1 (desactivada exitosamente con HTTP 200 OK).
- **Registros huérfanos generados en BD:** 0 (verificado: 0 especies QA activas restantes).
- **Estado de Dexie (IndexedDB):** Limpio al cerrarse el contexto del navegador.

---

## 8. Diagnóstico y causa raíz

### D1: Backend TEST en /configuracion/especies — **RESUELTO**
La corrección de la migración de Alembic en el backend TEST solventó completamente el error HTTP 500. La colección Newman arrojó 7 de 7 aserciones aprobadas: `POST /configuracion/especies` devuelve HTTP 201 Created y ante duplicidad devuelve legítimamente HTTP 409 Conflict.

### D2: Defecto de reactividad en la UI tras `replay()` en `syncQueue` (Frontend) — **ACTIVO**
El cliente frontend de la PWA no re-evalúa los conflictos en IndexedDB al recuperar conexión. `useEspecies` únicamente consulta `getConflictos()` en el montaje inicial. Como consecuencia, la alerta *"Conflicto de sincronización"* no se despliega de forma reactiva en pantalla ante la respuesta 409 real del backend.


### D3: Fila optimista no visible tras creación offline (UX) — **NUEVO HALLAZGO**
Al crear una especie offline con el catálogo paginado, la fila optimista se anexa al final de la lista (última página), no al inicio. El usuario que crea la especie no la ve aparecer de inmediato y debe navegar a la última página o filtrar por nombre para encontrarla.  
- **Severidad sugerida:** Medio  
- **Responsable:** Desarrollo Frontend

---

## 9. Veredicto final y estado de los issues

- **Veredicto Final TC-M09-G07:** **RECHAZADO**.
- **Issue #115 (`INC-M09-06-07`):** **NO CERRABLE (PARCIAL)**. Se validó favorablemente la habilitación de la escritura offline y la inserción optimista en Dexie, pero el flujo de recuperación y presentación de conflictos está roto por falta de reactividad en el frontend.
- **Acción Backend:** Se identificó un defecto backend (D1) que requiere escalamiento en Taiga por el error 500 bloqueante en `/configuracion/especies`.
- **Acción Frontend:** Se identificó un defecto frontend (D2) que requiere issue en Taiga para la adición de suscripción reactiva (`CustomEvent` o `useLiveQuery`) entre `syncQueue` y `useEspecies`.
- **Recomendación `declarados_sin_evidencia.csv`:** NO agregar fila manual; `resultado_TC-M09-G07_reintento2.json` se encuentra en la ubicación canónica y es parseado directamente por el dashboard como *Rechazado*.

---

## 10. Declaración de honestidad

> **"Declaro bajo compromiso profesional de QA que no se editó ningún archivo durante la ejecución activa, que ningún checkpoint fue modificado para forzar un veredicto favorable y que todas las evidencias y hallazgos aquí expuestos reflejan con total fidelidad el comportamiento real del sistema bajo prueba."**

---

## 11. Anexos

- **JSON Computable:** `resultados/resultado_TC-M09-G07_reintento2.json`
- **Captura UI Offline:** `evidencias/v3-reeval-20260924/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/01_ui_offline_habilitado.png`
- **Captura Registro Optimista:** `evidencias/v3-reeval-20260924/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/02_registro_optimista_pendiente.png`
- **Captura de Fallo (CP-4):** `evidencias/v3-reeval-20260924/screenshots/tc-m09-g07-sincronizacion-offline.cy.ts/TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15) -- valida la creación offline de especies, la detección de conflicto 409 al reconectar y el descarte de la operación diferida (failed).png`
- **Grabación en Video:** `evidencias/v3-reeval-20260924/videos/tc-m09-g07-sincronizacion-offline.cy.ts.mp4`
- **Resultado Newman Contratos:** `evidencias/v3-reeval-20260924/TC-M09-G07_postman_resultado.json`

---

## 12. Resultado de re-ejecución final V3
- **Fecha:** 2026-09-24
- **Intentos ejecutados:** 3 (Attempt 1 + 2 reintentos automáticos bajo Cypress `runMode: 2`)
- **Ediciones durante ejecución:** NO (Regla R14 respetada estrictamente)
- **CP-1:** `OK` (Especie base creada en backend TEST con HTTP 201)
- **CP-2:** `OK` (Botón "Nueva especie" interactivo en modo offline)
- **CP-3:** `OK` (Registro local optimista con tempId negativo y badge "Pendiente de sincronización" visible tras filtrar por nombre en catálogo paginado)
- **CP-4:** `FALLA` (Backend real retornó HTTP 409 y Dexie guardó `conflicto: true`, pero la alerta de conflicto en la UI nunca se renderizó por falta de reactividad en useEspecies tras replay - defecto D2)
- **CP-5:** `FALLA` (Bloqueado: opciones de resolución no desplegadas en interfaz)
- **Veredicto:** **RECHAZADO**





