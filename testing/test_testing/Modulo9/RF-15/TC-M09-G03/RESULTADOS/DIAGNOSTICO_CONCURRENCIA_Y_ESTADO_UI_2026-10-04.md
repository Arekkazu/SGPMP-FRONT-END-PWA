# Reporte de Diagnóstico y Pruebas — Defecto de Concurrencia y Persistencia de Error en UI (TC-M09-G03 / RF-15)

| Metadato | Detalle |
| :--- | :--- |
| **Caso de Prueba** | TC-M09-G03 (CU-01: Gestionar Catálogo de Especies Productivas) |
| **Ambiente Frontend** | `https://api.inmero.co` |
| **Ambiente Backend (API)** | `https://api.inmero.co/back-sigab-test` |
| **Usuario de Ejecución** | `administador.dev@gmail.com` |
| **Fecha de Ejecución** | 2026-10-04 / 2026-10-05 |
| **Veredicto Técnico** | **DEFECTO CONFIRMADO EN BACKEND Y FRONTEND (DEF-M09-01 + INC-UI-STATE)** |

---

## 1. Resumen Ejecutivo de Hallazgos

A partir de las pruebas empíricas automatizadas y el análisis del código fuente, se confirmaron **dos problemas críticos independientes**:

1. **Defecto de Asimetría Backend/Frontend (Por qué unas especies se pueden editar y otras no)**:
   * **Especies con `fecha_actualizacion: null`**: Están **100% bloqueadas para edición**. Al intentar editarlas, el backend responde sistemáticamente con `HTTP 412 CONFLICTO_CONCURRENCIA`:  
     > *"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo."*
   * **Especies con `fecha_actualizacion` válida**: **Permiten edición exitosa inmediata y consecutiva** (`HTTP 200 OK`), ya que el backend valida la concurrencia contra un timestamp real que sí coincide.
   * **Especies recién creadas**: Nacen con `fecha_actualizacion: null`, por lo cual **ninguna especie nueva creada puede ser editada por primera vez**.

2. **Defecto de Estado en Frontend (Por qué al cerrar la pestaña/modal y abrir otra especie sigue saliendo el mensaje de error)**:
   * En `ConfigurationPage.tsx`, el estado `saveError` proviene del hook `useEspecies()`.
   * La función `cerrar()` únicamente cambia el estado del modal: `const cerrar = () => setModal({ tipo: 'ninguno' });`.
   * **No se limpia el estado `saveError` al cerrar**.
   * Por lo tanto, si una especie falla con `HTTP 412`, la variable `saveError` se mantiene en memoria con ese error. Al hacer clic en cualquier otra especie, el modal vuelve a renderizarse recibiendo el `saveError` anterior, mostrando inmediatamente el aviso de conflicto antes de que el usuario siquiera intente guardar.

---

## 2. Matriz de Ejecución y Resultados de Pruebas

Se ejecutó una batería de pruebas de edición sobre el ambiente real `https://api.inmero.co/back-sigab-test`:

| Grupo | ID | Nombre Especie | Estado `fecha_actualizacion` | Intento de Edición | Código HTTP | Mensaje de Respuesta | Resultado |
| :--- | :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| **Grupo A (Sin editar previamente)** | 42 | **Equino** | `null` | Formulario UI (Timestamp cliente) | **412** | *"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo."* | **BLOQUEADO** |
| **Grupo A (Sin editar previamente)** | 39 | **Bovino** | `null` | Formulario UI (Timestamp cliente) | **412** | *"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo."* | **BLOQUEADO** |
| **Grupo A (Sin editar previamente)** | 41 | **Ave Qa Je** | `null` | Formulario UI (Timestamp cliente) | **412** | *"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo."* | **BLOQUEADO** |
| **Grupo B (Con historial previo)** | 1 | **Tilapia Roja** | `2026-10-05T02:42:15Z` | Edición 1 $\rightarrow$ Edición 2 consecutiva | **200 $\rightarrow$ 200** | Registro actualizado y nuevo timestamp devuelto | **EXITOSO** |
| **Grupo B (Con historial previo)** | 5 | **Mojarra Plateada**| `2026-09-26T03:22:54Z` | Edición 1 $\rightarrow$ Edición 2 consecutiva | **200 $\rightarrow$ 200** | Registro actualizado y nuevo timestamp devuelto | **EXITOSO** |
| **Grupo C (Ciclo de vida nueva)** | 70 | **Especie Diagnostico Auto** | `null` (al nacer con `POST`) | Edición inmediatamente posterior a creación | **412** | *"La especie fue modificada por otro usuario. Recargue los datos e intente de nuevo."* | **BLOQUEADO** |

---

## 3. Análisis Causa Raíz de Código

### Causa Raíz 1: Asimetría en la Concurrencia Optimista (Backend & Frontend)

* **En Backend (`PATCH /configuracion/especies/{id}`)**:
  1. Si se envía `fecha_actualizacion: null`, el DTO falla con `HTTP 400 VAL_ENTRADA` (*"El valor ingresado no es una fecha y hora válida"*).
  2. Si se envía cualquier fecha, el backend compara directamente `fecha_solicitud == especie_bd.fecha_actualizacion`. Al ser `NULL` en base de datos, la comparación resulta falsa y dispara `HTTP 412 (CONFLICTO_CONCURRENCIA)`.
* **En Frontend (`src/configuration/components/EspeciesModal.tsx`, línea 75)**:
  ```typescript
  fecha_actualizacion: especie.fecha_actualizacion ?? new Date().toISOString(),
  ```
  Al enviar `new Date().toISOString()`, se envía una fecha que jamás va a coincidir con el `NULL` del backend, causando el rechazo garantizado.

### Causa Raíz 2: Fuga de Estado en el Modal (Frontend UI)

* **Ubicación:** `src/configuration/pages/ConfigurationPage.tsx` y `src/configuration/hooks/useEspecies.ts`.
* **Mecanismo:**
  1. Cuando una especie falla con 412, `useEspecies` guarda el error en `saveError`.
  2. Al presionar "Cancelar" o la "X" del modal, se ejecuta:
     ```typescript
     const cerrar = () => setModal({ tipo: 'ninguno' });
     ```
  3. `saveError` nunca es reseteado a `null` al cerrar el modal.
  4. Al abrir una especie diferente:
     ```tsx
     <EspeciesModal
       especie={modal.tipo === 'editar' ? modal.especie : null}
       saving={saving}
       saveError={saveError} // <--- Sigue conteniendo el error de la especie anterior
       onClose={cerrar}
       ...
     />
     ```
  5. `EspeciesModal` evalúa inmediatamente:
     ```tsx
     {saveError && (
       <Alert
         variant="error"
         title={saveError.status === 412 ? t('especiesmodal.conflicto_de_edicion') : t('especiesmodal.error_al_guardar')}
         description={saveError.message}
       />
     )}
     ```
     Mostrando el aviso falso de que la nueva especie tiene conflicto, aun cuando el usuario ni siquiera ha intentado editarla.

---

## 4. Recomendaciones de Remediación

1. **Remediación en Frontend (Inmediata)**:
   * **Limpieza de estado:** Exponer una función `limpiarError()` desde `useEspecies` o ejecutar `setSaveError(null)` cada vez que el modal se cierra o se abre una nueva especie.
   * **Manejo de null en envío:** Evitar enviar timestamps inventados (`new Date().toISOString()`) si el backend habilita recibir `null` o `fecha_creacion`.
2. **Remediación en Backend**:
   * En `POST /configuracion/especies`: Inicializar `fecha_actualizacion = fecha_creacion` al crear una especie, garantizando que nunca nazca con `NULL`.
   * En `PATCH /configuracion/especies/{id}`: Permitir que `fecha_actualizacion` sea opcional/nula en el DTO y, si en base de datos es `NULL`, validar contra `fecha_creacion` o permitir la actualización sin falso conflicto.
   * Ejecutar un script de base de datos en producción/pruebas:
     ```sql
     UPDATE especies SET fecha_actualizacion = fecha_creacion WHERE fecha_actualizacion IS NULL;
     ```
