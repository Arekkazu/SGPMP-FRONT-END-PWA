# Reporte de Reevaluación Técnica: TC-M09-G07
### (Evaluación de Disponibilidad PWA Offline-First y Manejo de Conflictos de Unicidad)

---

## 1. Información General de la Reevaluación

| Parámetro | Detalle |
| :--- | :--- |
| **Identificador de Caso** | `TC-M09-G07` (ID Original: `TC-M09-17`) |
| **Módulo / Requerimiento** | Módulo 9 (Configuración del Sistema) / `RF-15` (Catálogo de Especies Productivas) |
| **Caso de Uso** | `CU-01 – Gestionar Catálogo de Especies Productivas` (Flujo Alterno: Sincronización Offline y Manejo de Conflictos) |
| **Fecha y Hora de Reevaluación** | 2026-09-12 22:04:00 (UTC-5) / `2026-09-13T03:04:44Z` |
| **Responsable de Ejecución** | Ingeniero de QA Senior (Cypress, Arquitectura PWA Offline-First y API REST) |
| **Ambientes Evaluados** | **Frontend TEST:** `https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io`<br>**Backend TEST:** `https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test` |
| **Cuenta de Ejecución Vigente** | `admin.dev@gmail.com` (Rol: Administrador / Contraseña: `Test1234!`) |
| **Dato de Prueba Autorizado** | Nombre: `Especie Conflicto QA FGXPLU` (alfabético dinámico sin números para regla backend)<br>Descripción: `Especie temporal para prueba de unicidad y arquitectura` |
| **Herramientas de Ejecución** | Cypress v13.17.0 (Chrome Headless 152) / API REST direct request (`cy.request`) |

---

## 2. Antecedentes y Corrección de Contexto

> [!IMPORTANT]
> **Corrección de Contexto y Descarte de Diagnóstico Preliminar:**  
> En una inspección preliminar de código se intentó clasificar este caso como *"Escenario C: Online-only write por diseño válido"*, sugiriendo un dictamen de aprobación con alcance redefinido.  
> **Dicho dictamen preliminar queda TOTALMENTE DESCARTADO.** Al contrastar contra la **Ficha Técnica Oficial del Requerimiento RF-15 (Versión 1.0)**, se confirmó que el soporte offline con sincronización diferida y manejo de conflictos es un **mandato formal no negociable**:
> 1. **Sección "Proceso" (Punto 9):** *"Modo offline: Si no hay conexión, las operaciones se almacenan localmente. Se sincronizan automáticamente al restablecer conexión."*
> 2. **Sección "Flujo alterno" (Error de sincronización en modo offline):** *"El sistema intenta sincronizar una nueva especie creada localmente, pero al llegar al servidor, el nombre ya fue tomado por otro usuario durante el periodo de desconexión. El sistema marca el registro local con error y notifica al usuario en la próxima conexión."* Mensaje de UI requerido: *"Fallo de sincronización. La especie creada en modo offline '[NOMBRE_ESPECIE]' ya existe en el servidor. Por favor, resuelva el conflicto manualmente."*
> 3. **Sección "Criterios de aceptación":** *"En modo offline: El sistema permite registrar cambios localmente. Los cambios se sincronizan automáticamente al recuperar conexión."*
> 4. **Requerimiento No Funcional (Disponibilidad):** *"El sistema debe soportar operación en modo offline con sincronización diferida."*
>
> Por tanto, el bloqueo del botón `"Nueva especie"` sin red (`disabled={!online}`) **NO constituye una protección legítima de diseño, sino un INCUMPLIMIENTO DIRECTO de RF-15 (Defecto DEF-M09-02)**.

---

## 3. Paso 1: Búsqueda Textual (Grep) de Credenciales Obsoletas

Se ejecutó la búsqueda del usuario obsoleto `admin@pecuaria.co` en el árbol de prueba del caso:

```
SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/commands.ts:15:
  email = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co',

SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/tc-m09-g07-sincronizacion-offline.cy.ts:5:
  const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
```

**Confirmación:** Se reemplazó el usuario obsoleto por la cuenta corporativa vigente `admin.dev@gmail.com`.

---

## 4. Paso 2: Diffs Reales de Archivos Modificados

A continuación se presentan los diffs unificados generados por Git sobre los artefactos de testing:

### 4.1 commands.ts
```diff
--- a/testing/test_testing/Modulo9/RF-15/TC-M09-G07/commands.ts
+++ b/testing/test_testing/Modulo9/RF-15/TC-M09-G07/commands.ts
@@ -14,3 +14,3 @@
 Cypress.Commands.add('loginUI', (
-  email = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co',
+  email = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com',
   password = Cypress.env('ADMIN_PASSWORD') || 'Test1234!',
```

### 4.2 tc-m09-g07-sincronizacion-offline.cy.ts
```diff
--- a/testing/test_testing/Modulo9/RF-15/TC-M09-G07/tc-m09-g07-sincronizacion-offline.cy.ts
+++ b/testing/test_testing/Modulo9/RF-15/TC-M09-G07/tc-m09-g07-sincronizacion-offline.cy.ts
@@ -1,11 +1,13 @@
 /// <reference types="cypress" />
 
-const DIR = 'RESULTADOS/TC-M09-G07';
+const DIR = 'RESULTADOS/REEVALUACION_2026-09-12';
 const ENDPOINT_ESPECIES = '/configuracion/especies';
-const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co';
+const CUENTA_EJECUCION_EMAIL = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com';
 const CUENTA_EJECUCION_PASSWORD = Cypress.env('ADMIN_PASSWORD') || 'Test1234!';
-const DATO_NOMBRE = 'Bovino';
-const DATO_DESCRIPCION = 'Especie bovina productiva';
+// Regla backend: El nombre solo puede contener letras y espacios, sin símbolos ni números.
+const letrasAleatorias = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
+const DATO_NOMBRE = `Especie Conflicto QA ${letrasAleatorias}`;
+const DATO_DESCRIPCION = 'Especie temporal para prueba de unicidad y arquitectura';
```

---

## 5. Paso 3: Auditoría de Precondiciones y Datos de Prueba

1. **Colisión de Nombre Fijo:** El spec original utilizaba `DATO_NOMBRE = 'Bovino'`. La auditoría de base de datos confirmó que `"Bovino"` ya existe preexistente con el **ID #39**.
2. **Regla de Validación de API:** Al parametrizar datos dinámicos, el backend rechazó inicialmente con `HTTP 400 VAL_ENTRADA` los timestamps numéricos (*"El nombre solo puede contener letras y espacios, sin símbolos ni números"*).
3. **Dato Dinámico Autorizado:** Se implementó un generador alfabético aleatorio (`Especie Conflicto QA ${letrasAleatorias}`, 26 caracteres) que satisfizo la precondición de unicidad previa y la regla léxica de la API.

---

## 6. Paso 4: Resultados Reales de la Corrida Cypress E2E

Se ejecutó la suite con Chrome Headless (`npx cypress run --browser chrome`).

```
====================================================================================================
  Spec Ran: tc-m09-g07-sincronizacion-offline.cy.ts (Duration: 9s)
  Browser:  Chrome 152 (headless)
====================================================================================================

  Running:  tc-m09-g07-sincronizacion-offline.cy.ts                                         (1 of 1)

  TC-M09-G07 - Sincronización Offline y Conflicto de Nombres de Especie (RF-15)
  [writeResult] -> ...\RESULTADOS\REEVALUACION_2026-09-12\TC-M09-G07_resultado.json
  [writeResult] -> ...\RESULTADOS\REEVALUACION_2026-09-12\TC-M09-G07_resultado.md
    √ evalúa la protección offline PWA, el registro base dinámico y la prevención de duplicados (HTTP 409) (9061ms)

  1 passing (10s)

  (Screenshots)
  - 01_ui_offline_bloqueo_incumplimiento.png (1258x622)
  - 02_intento_registro_especie.png (1258x622)

  (Video)
  - tc-m09-g07-sincronizacion-offline.cy.ts.mp4
```

| Checkpoint | Criterio de Aceptación (RF-15) | Resultado Técnico Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **CP-1: Precondición de Datos** | La especie de prueba no debe existir en el catálogo TEST. | **OK.** Confirmado: `"Especie Conflicto QA FGXPLU"` no existía previamente en el catálogo TEST. | **OK** |
| **CP-2: Soporte de Creación Offline con Sincronización Diferida** | El sistema debe permitir registrar especies localmente sin conexión para sincronización diferida (botón habilitado con guardado en IndexedDB / syncQueue). | **INCUMPLIMIENTO CONFIRMADO:** El botón *"Nueva especie"* permanece inhabilitado (`disabled={!online}`) y la UI muestra *"Las acciones de escritura están deshabilitadas"*. No existe alternativa de creación diferida en Dexie ni integración con `syncQueue.ts`. | **FALLA** |
| **CP-3: Registro Base de Especie en Servidor** | `POST /configuracion/especies` responde `HTTP 201/200 OK` con ID asignado y objeto de especie creada. | **HTTP 201 OK.** ID asignado: **#46** (`es_activo: true`). El incidente histórico `HTTP 500` está totalmente superado. | **OK** |
| **CP-4: Rechazo de Duplicado de Nombre (Unicidad en Servidor)** | `HTTP 409 Conflict` impidiendo la creación de duplicados y la sobrescritura. | **HTTP 409 OK.** El servidor rechazó con éxito la duplicación: `{"error_code":"ESPECIE_DUPLICADA","message":"La especie 'Especie Conflicto QA FGXPLU' ya se encuentra registrada en el catálogo."}`. | **OK** |
| **CP-5: Flujo de Conflicto Offline y Registro de Defecto DEF-M09-02** | El sistema debe implementar el flujo alterno de conflicto diferido con notificación al usuario ante colisión en servidor. | **NO IMPLEMENTADO (BLOQUEADO POR DEF-M09-02):** Al no soportar creación offline en el cliente, el flujo de detección de conflicto al reconectar y la notificación requerida por RF-15 (*"Fallo de sincronización..."*) no existen en la UI. | **FALLA** |

---

## 7. Paso 5: Verificación y Descarte de Fuentes Alternativas de Error

Para otorgar total certeza técnica al defecto, se evaluaron y descartaron cuatro hipótesis alternativas:

1. **Decisión de Negocio o Limitación en Historial Git:**
   - Se revisó el commit `88ca728` (PR #60, Issue #54). El autor documentó que `syncQueue.ts` fue diseñado genérico por módulo (`registerSyncHandler/replay`).
   - No existe ninguna mención en el historial ni en issues cerrados que postergue formalmente Especies a una fase posterior; simplemente el desarrollo no fue extendido a este catálogo.
2. **Mecanismo de Detección Offline del Sistema:**
   - Se auditó `src/shared/hooks/useOnlineStatus.ts`. Escucha exclusivamente los eventos nativos del navegador (`navigator.onLine`, `window.addEventListener('online'/'offline')`).
   - El bloqueo observado en Cypress es **100% idéntico** al que experimenta un usuario real en una tablet o navegador al perder la conectividad física.
3. **Feature Flags o Variables de Entorno:**
   - La búsqueda de flags condicionales (`ENABLE_OFFLINE`, `FEATURE_FLAG`, etc.) arrojó cero coincidencias en todo el código fuente. La directiva `disabled={!online}` es incondicional.
4. **Validez del Test de Cypress:**
   - El spec espera la renderización de la alerta reactiva (`Sin conexión`) antes de evaluar el botón, descartando condiciones de carrera.

---

## 8. Declaración Concluyente sobre el Defecto DEF-M09-02

> [!WARNING]
> ### DICTAMEN TÉCNICO DEFINITIVO: DEFECTO REAL CONFIRMADO (DEF-M09-02)
> 1. **Severidad:** **Alta.**  
> 2. **Impacto:** El sistema incumple un requerimiento no funcional crítico de disponibilidad PWA (operación offline-first) estipulado en **RF-15**.
> 3. **Causa Raíz:** En `ConfigurationPage.tsx` (línea 159), el botón está cableado con `disabled={!online}`. En `useEspecies.ts`, el método `registrar()` carece de lógica de encolamiento y `config_especies` en Dexie solo actúa como caché de lectura.
> 4. **Patrón de Solución Disponible:** El módulo de Ciclos Biológicos (RF-16, commit `88ca728`) ya resolvió este problema de forma exitosa usando `syncQueue.ts`, actualizador optimista con flag `pendienteSync` y `useSyncOnReconnect`. El equipo de desarrollo debe replicar este patrón en `useEspecies.ts`.

---

## 9. Alcance del Defecto sobre el Módulo 9

> [!NOTE]
> ### Hallazgo Transversal de Arquitectura
> La auditoría de los hooks del Módulo 9 reveló que la ausencia de soporte offline no es un problema exclusivo de Especies:
> - **`usePatologias.ts`:** Solo escritura online directa vía API.
> - **`useMetricasProduccion.ts`:** Solo escritura online directa vía API.
>
> **Conclusión:** De todo el Módulo 9, **únicamente Ciclos Biológicos cuenta con soporte offline de escritura**. Se recomienda abordar `DEF-M09-02` en conjunto para los tres catálogos maestros pendientes.

---

## 10. Veredicto Final QA

<div align="center">

### ⚠️ CON FALLAS (RECHAZADO) — INCUMPLIMIENTO DE RF-15
**El Catálogo de Especies opera de forma puramente ONLINE para escrituras (disabled={!online}), incumpliendo la capacidad offline-first, sincronización diferida y manejo de conflictos exigidos por la ficha técnica de RF-15. Defecto DEF-M09-02 confirmado sin salvedades.**

</div>

---

## 11. Artefactos y Evidencias de Respaldo

- **Reporte JSON:** [TC-M09-G07_resultado.json](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/RESULTADOS/REEVALUACION_2026-09-12/TC-M09-G07_resultado.json)
- **Reporte Markdown:** [TC-M09-G07_resultado.md](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/RESULTADOS/REEVALUACION_2026-09-12/TC-M09-G07_resultado.md)
- **Captura 01 (Bloqueo Offline / Incumplimiento):** [01_ui_offline_bloqueo_incumplimiento.png](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/RESULTADOS/REEVALUACION_2026-09-12/screenshots/01_ui_offline_bloqueo_incumplimiento.png)
- **Captura 02 (Registro Exitoso Online y Unicidad):** [02_intento_registro_especie.png](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/RESULTADOS/REEVALUACION_2026-09-12/screenshots/02_intento_registro_especie.png)
- **Video de Ejecución Grabado:** [tc-m09-g07-sincronizacion-offline.cy.ts.mp4](SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-15/TC-M09-G07/RESULTADOS/REEVALUACION_2026-09-12/videos/tc-m09-g07-sincronizacion-offline.cy.ts.mp4)
