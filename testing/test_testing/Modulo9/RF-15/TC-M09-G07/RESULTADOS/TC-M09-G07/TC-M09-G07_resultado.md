# TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15 - Módulo 9)

| Campo | Valor |
|---|---|
| Caso de uso / Requisito | CU-01 - Gestionar Catálogo de Especies Productivas - RF-15 |
| Tipo / Equipo | Funcional (UI, PWA & API) - Frontend / QA |
| Ambiente (front) | https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io |
| Backend | https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test |
| Navegador | chrome 152.0.7977.76 |
| Fecha ejecución | 2026-09-05T14:28:00.000Z |
| Dato de prueba | Nombre: `Bovino`, Descripción: `Especie bovina productiva` |

## Checkpoints

| Paso | Esperado | Obtenido | Estado |
|---|---|---|---|
| CP-1: Precondición de datos en catálogo TEST | No debe existir una especie previamente llamada "Bovino" | Confirmado: "Bovino" no existe en el catálogo TEST (0 registros). | **OK** |
| CP-2: Protección UI de creación en modo Offline | El botón "Nueva especie" debe estar inhabilitado (disabled) al estar offline | Botón "Nueva especie" inhabilitado correctamente en UI (disabled=true) al detectar estado offline. | **OK** |
| CP-3: Registro base de especie "Bovino" en servidor | HTTP 201/200 OK con ID asignado y objeto de especie creada | Fallo de servidor Backend TEST. HTTP 500. Body: `{"codigo":"ERROR_INTERNO","mensaje":"Error inesperado en base de datos"}` | **FALLA** |
| CP-4: Rechazo de duplicado de nombre "Bovino" en servidor | HTTP 409 Conflict (o 400 Bad Request) notificando duplicidad de nombre | No pudo evaluarse el conflicto debido a la falla previa HTTP 500 en la creación base. | **FALLA** |
| CP-5: Verificación de Modelo Arquitectónico Offline en PWA | Documentación de la política de escritura únicamente online en Catálogo de Especies | Confirmado: El módulo de especies no utiliza cola de encolamiento syncQueue.ts ni Dexie para escritura offline. Las acciones de modificación están inhabilitadas sin conexión (escritura online-only). | **OK** |

## Veredicto: CON FALLAS

## Registro técnico & Hallazgo de Arquitectura

- **Detalle técnico de red / ejecución**: POST /configuracion/especies (creación base) -> HTTP 500 (ERROR_INTERNO: Error inesperado en base de datos).
- **Hallazgo de Arquitectura (Gap)**: El módulo de Catálogo de Especies opera bajo un modelo de **escritura únicamente online (online-only write)**. La UI inhabilita las acciones de creación y edición al detectar corte de conexión (`disabled={!online}`), sin utilizar la cola de sincronización offline (`syncQueue.ts` / IndexedDB). Por consiguiente, la resolución diferida de conflictos de nombres (TC-M09-17) no es aplicable a la arquitectura actual del módulo de especies.

## Evidencias visuales

- [01_ui_offline_proteccion.png](screenshots/01_ui_offline_proteccion.png): Alerta de sin conexión y botón 'Nueva especie' inhabilitado en UI.
- [02_intento_registro_bovino.png](screenshots/02_intento_registro_bovino.png): Formulario o respuesta visual del registro de la especie.
