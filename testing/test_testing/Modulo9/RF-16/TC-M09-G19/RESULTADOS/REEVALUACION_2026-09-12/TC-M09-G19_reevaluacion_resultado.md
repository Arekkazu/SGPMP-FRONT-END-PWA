# Reporte de Reevaluación Técnica: TC-M09-G19

**ID del Caso Agrupado:** TC-M09-G19 (Sub-caso original: TC-M09-43)  
**Módulo:** Módulo 9 – Configuración del Sistema y Parámetros Productivos  
**Requisito Funcional:** RF-16 (CU-02 – Configurar Parámetros Productivos y Sanitarios por Especie)  
**Tipo de Prueba:** Disponibilidad / Integración Offline-First (PWA Frontend + REST API Backend)  
**Fecha de Reevaluación:** 2026-09-12  
**Entorno de Ejecución:** PWA Frontend (Cypress 13.17.0, Chrome 152 Headless) + Backend REST API (.NET Core 8 / FastAPI / PostgreSQL)  
**Usuario Evaluador:** QA Senior Automation Engineer  

---

## 1. Veredicto Final

### **VEREDICTO: ✅ APROBADO / SIN FALLAS BLOQUEANTES**

Se certifica el funcionamiento de extremo a extremo de la arquitectura **Offline-First con Sincronización Diferida** para el catálogo de ciclos biológicos de especies productivas (RF-16 / TC-M09-43):
- **Creación en modo offline:** El botón "Nuevo ciclo" permanece habilitado sin conexión; el formulario permite el registro local persistiendo la operación en la cola IndexedDB (`syncQueue`) con un ID temporal negativo y el distintivo visual `Pendiente de sincronización`.
- **Sincronización diferida automática:** Al restablecer la conexión (`window.dispatchEvent('online')`), el hook `useSyncOnReconnect` dispara la cola (`replay()`), el backend procesa la solicitud retornando `HTTP 201 Created` con el ID definitivo asignado (#37), y la interfaz actualiza la tabla removiendo la marca de pendiente.
- **Teardown idempotente:** El ciclo de prueba fue desactivado exitosamente vía `PATCH /configuracion/ciclos/37/desactivar` (HTTP 200) y verificado inactivo (`es_activo: false`) mediante consulta posterior `GET`.

---

## 2. Antecedentes y Estado Original (2026-09-05)

En la evaluación ejecutada el 2026-09-05, TC-M09-G19 obtuvo un veredicto **CON FALLAS** debido a un hallazgo de arquitectura:
- La UI deshabilitaba las acciones de escritura (`disabled={!online}` en el botón "Nuevo ciclo") y mostraba una alerta indicando que no se permitía crear sin red.
- No existía integración con `syncQueue.ts` ni persistencia en Dexie para ciclos biológicos, catalogándose el módulo como "Escritura Únicamente Online".
- El spec original de Cypress fue codificado asumiendo dicha limitación (esperando que el botón estuviera deshabilitado en CP-2 y registrando una observación en CP-5).

---

## 3. Evidencia de Código: Implementación Offline-First (Commit 88ca728 / PR #60)

En el commit `88ca728` (Pull Request `#60`, mergeado en `36bca2c`), el equipo de desarrollo implementó la sincronización diferida para cumplir con TC-M09-43:
- **`SGPMP-FRONT-END-PWA/src/shared/sync/syncQueue.ts`:** Se introdujo `registerSyncHandler('ciclos_biologicos', ...)` y `replay()`.
- **`SGPMP-FRONT-END-PWA/src/shared/sync/useSyncOnReconnect.ts`:** Hook global que escucha el evento `online` del navegador para disparar el reintento de la cola.
- **`SGPMP-FRONT-END-PWA/src/shared/db/db.ts`:** En la versión 8 de Dexie se incorporó la tabla `ciclos_biologicos: 'id_ciclo_biologico, id_especie, es_activo'` y la interfaz `CicloBiologicoCacheRow`.
- **`SGPMP-FRONT-END-PWA/src/configuration/hooks/useCiclosBiologicos.ts`:** Métodos `registrar`, `editar` y `desactivar` encolan en `syncQueue` cuando `!navigator.onLine`, aplicando actualización optimista con `pendienteSync: true`.
- **`SGPMP-FRONT-END-PWA/src/configuration/components/CiclosSection.tsx`:** El botón "Nuevo ciclo" ya no se deshabilita sin conexión; la tabla renderiza el badge `Pendiente de sincronización`.

---

## 4. Ajustes del Arnés de Prueba (Diffs del Spec)

Para validar el comportamiento real implementado y no la limitación histórica obsoleta, se actualizaron `commands.ts` y `tc-m09-g19-sincronizacion-offline-parametros.cy.ts`:

### 4.1. Actualización de Credenciales (Paso 1)
```diff
--- SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/commands.ts
+++ SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/commands.ts
@@ -14,1 +14,1 @@
-  email = Cypress.env('ADMIN_EMAIL') || 'admin@pecuaria.co',
+  email = Cypress.env('ADMIN_EMAIL') || 'admin.dev@gmail.com',
```

### 4.2. Actualización de CP-2 y CP-3 (Paso 2)
Se validó la creación offline con ID temporal negativo y su posterior sincronización diferida automática:
```diff
--- SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/tc-m09-g19-sincronizacion-offline-parametros.cy.ts
+++ SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/tc-m09-g19-sincronizacion-offline-parametros.cy.ts
@@ -243,26 +243,45 @@
-    // Verificar que el botón "Nuevo ciclo" está deshabilitado en UI
-    cy.contains('button', 'Nuevo ciclo').should('exist').then(($btn) => {
-      const isDisabled = $btn.is(':disabled') || $btn.attr('disabled') !== undefined;
-      checks.push({ ... esperado: 'Botón "Nuevo ciclo" deshabilitado ...' });
-    });
+    // Verificar alerta "Sin conexión" y que el botón "Nuevo ciclo" permanece habilitado
+    cy.contains('Sin conexión').should('be.visible');
+    cy.contains('button', 'Nuevo ciclo').should('be.visible').and('not.be.disabled');
+
+    const nombreCicloOffline = `Fase Alevinaje Offline ${Date.now()}`;
+    cy.contains('button', 'Nuevo ciclo').click();
+    cy.get('#ciclo-modal-title', { timeout: 10000 }).should('be.visible');
+    cy.get('input[name="nombre"]').type(nombreCicloOffline);
+    cy.get('input[name="duracion_dias"]').clear().type('45');
+    cy.get('#ciclo-desc').type('Prueba E2E RF-16 TC-M09-G19 Offline');
+    cy.contains('button', 'Registrar ciclo').click();
+
+    // Validar encolamiento local en Dexie, badge pendienteSync e ID temporal
+    cy.contains('tr', nombreCicloOffline, { timeout: 10000 }).scrollIntoView().should('be.visible').within(() => {
+      cy.contains('Pendiente de sincronización').should('be.visible');
+      cy.get('td').first().invoke('text').should('match', /#-\d+/);
+    });
```

### 4.3. Resolución de Bloqueo de Promesa en Headless (Ajuste al Arnés de Prueba)
En Chrome headless, al no existir un Service Worker activo registrado en el dominio de pruebas, `navigator.serviceWorker.ready` retorna una promesa que nunca resuelve, bloqueando `enqueue()` indefinidamente. Se resolvió en el arnés de prueba sin modificar el código de producción:
```typescript
cy.window().then((win) => {
  if (win.navigator.serviceWorker) {
    try {
      Object.defineProperty(win.navigator.serviceWorker, 'ready', {
        configurable: true,
        value: Promise.resolve({ sync: { register: () => Promise.resolve() } }),
      });
    } catch {}
  }
  Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false });
  win.dispatchEvent(new win.Event('offline'));
});
```

### 4.4. Actualización de CP-5 (Paso 3)
```diff
       checks.push({
         id: 'CP-5',
         nombre: 'Verificación de Modelo de Sincronización Offline (PWA)',
-        tipo: 'OBSERVACION',
-        esperado: 'Cola de sincronización offline (syncQueue) para parámetros de ciclos biológicos',
-        obtenido: 'La PWA implementa modelo Online-Only para configuración de ciclos ...',
-        resultado: 'OBSERVACION',
+        tipo: 'CHECK',
+        esperado: 'Cola de sincronización offline (syncQueue/Dexie) con sincronización diferida al reconectar',
+        obtenido: 'Arquitectura offline-first confirmada: creación offline encolada y sincronizada exitosamente al reconectar (commit 88ca728, PR #60)',
+        resultado: 'OK',
       });
```

---

## 5. Registro de Intentos Previos e Incidente de Rate-Limiting

Durante la sesión de reevaluación se documentaron de manera transparente los siguientes incidentes técnicos:

1. **Intento 1 (19:29 UTC):** Falló en el cierre del modal de creación offline debido a que `navigator.serviceWorker.ready` quedó esperando indefinidamente en Chrome headless.
2. **Intento 2 (19:30 UTC):** Con el arnés de prueba resolviendo la promesa de `serviceWorker.ready`, el ciclo se creó exitosamente fuera de línea en Dexie y se cerró el modal; falló la aserción de visibilidad de fila al encontrarse en la posición 14 de la tabla fuera del viewport inicial. Se corrigió añadiendo `scrollIntoView()`.
3. **Intento 3 (19:31 UTC) — Incidente de Seguridad / Rate Limiting (INC-M09-03):** Al ejecutar la prueba consecutivamente, el backend activó la protección anti fuerza bruta bloqueando temporalmente la cuenta `admin.dev@gmail.com` con `HTTP 423 Locked` indicando ventana de desbloqueo a las `19:45:46 UTC`.
4. **Intervención del DBA:** Debido a que el mecanismo de desbloqueo automático del backend no restauró el acceso oportunamente en el tiempo estipulado, el DBA procedió al desbloqueo manual directo en la base de datos.
5. **Verificación Aislada (Paso 0):** Previo a relanzar la suite, se ejecutó una única petición aislada contra `POST /sesiones/`, confirmando el estado `HTTP 200 OK` con emisión de Bearer Token válido.

> **Nota Técnica de Seguridad:** El rate-limiting de cuenta es un comportamiento de seguridad correcto y esperado del backend cuando funciona bien; sin embargo, se detectó por separado que el mecanismo de desbloqueo automático no se ejecutó correctamente en esta ocasión (ver incidente `INC-M09-03`), lo cual es independiente del resultado funcional del módulo evaluado en TC-M09-G19.

---

## 6. Checkpoints de la Corrida Final Limpia

**Comando ejecutado:**
```bash
cd SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19
npx cypress run --config-file cypress.config.js --spec tc-m09-g19-sincronizacion-offline-parametros.cy.ts --browser chrome --headless --env ADMIN_EMAIL="admin.dev@gmail.com",ADMIN_PASSWORD="Test1234!"
```

### 6.1. Tabla de Checkpoints Evaluados

| ID | Nombre | Tipo | Esperado | Obtenido | Resultado |
|---|---|---|---|---|---|
| **CP-1** | Precondición - Especie Cachama Blanca activa | CHECK | Especie #4 "Cachama Blanca" activa en backend TEST | Especie id_especie=4 encontrada (`es_activo: true`) | **OK** |
| **CP-2** | Soporte y Creación UI Offline en Ciclos de Cachama Blanca | CHECK | Botón "Nuevo ciclo" habilitado en offline, alerta visible y ciclo persistido en Dexie con ID temporal y badge `Pendiente de sincronización` | Botón habilitado, alerta visible, registro añadido a Dexie con ID temporal y badge visual verificado | **OK** |
| **CP-3** | Sincronización Diferida Automática al Recuperar Conectividad | CHECK | Disparo de `replay()` por `useSyncOnReconnect`, HTTP 201 del backend y remoción del badge `pendienteSync` | HTTP 201 - Ciclo sincronizado exitosamente con ID definitivo **#37** | **OK** |
| **CP-4** | Limpieza y Verificación de Teardown de Datos de Prueba | CHECK | Ciclo de prueba desactivado en hook `after()` y verificado inactivo con GET posterior | Teardown PATCH HTTP 200 + verificación GET posterior confirmada (`es_activo: false`) | **OK** |
| **CP-5** | Verificación de Modelo de Sincronización Offline (PWA) | CHECK | Cola de sincronización offline (`syncQueue`/Dexie) con sincronización diferida al reconectar | Arquitectura offline-first confirmada: creación offline encolada y sincronizada exitosamente al reconectar (commit `88ca728`, PR #60) | **OK** |

### 6.2. Salida Cruda de Cypress
```text
====================================================================================================

  (Run Starting)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Cypress:        13.17.0                                                                        │
  │ Browser:        Chrome 152 (headless)                                                          │
  │ Node Version:   v26.1.0 (C:\nvm4w\nodejs\node.exe)                                             │
  │ Specs:          1 found (tc-m09-g19-sincronizacion-offline-parametros.cy.ts)                   │
  │ Searched:       SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/tc-m09-g19-   │
  │                 sincronizacion-offline-parametros.cy.ts                                        │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                    
  Running:  tc-m09-g19-sincronizacion-offline-parametros.cy.ts                              (1 of 1)


  TC-M09-G19 · Sincronización offline de parámetros de ciclo biológico por especie
    √ Ejecuta autenticación online, navegación a Cachama Blanca, simulación offline/online y teardown verificado (13645ms)


  1 passing (14s)


  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        1                                                                                │
  │ Passing:      1                                                                                │
  │ Failing:      0                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  4                                                                                │
  │ Video:        true                                                                             │
  │ Duration:     14 seconds                                                                       │
  │ Spec Ran:     tc-m09-g19-sincronizacion-offline-parametros.cy.ts                               │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Evidencias Visuales y Multimedia

Todas las evidencias generadas durante la corrida oficial se encuentran archivadas en la carpeta de reevaluación:

- **Captura 01 (Online Inicial en Sección de Especie):**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/RESULTADOS/REEVALUACION_2026-09-12/screenshots/01_ui_ciclos_cachama_online.png`
- **Captura 02 (Creación Offline y Badge Pendiente):**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/RESULTADOS/REEVALUACION_2026-09-12/screenshots/02_ui_ciclos_cachama_offline.png`
- **Captura 03 (Online Restablecido):**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/RESULTADOS/REEVALUACION_2026-09-12/screenshots/03_ui_ciclos_cachama_online_restablecido.png`
- **Captura 04 (Registro de Ciclo Sincronizado Definitivo #37):**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/RESULTADOS/REEVALUACION_2026-09-12/screenshots/04_registro_ciclo_alevinaje_resultado.png`
- **Video Completo de la Ejecución:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G19/RESULTADOS/REEVALUACION_2026-09-12/videos/tc-m09-g19-sincronizacion-offline-parametros.cy.ts.mp4`
