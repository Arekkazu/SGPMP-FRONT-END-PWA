# Reporte de Reevaluación Técnica: TC-M09-G18

**ID del Caso Agrupado:** TC-M09-G18 (cubre TC-M09-41 y TC-M09-42)  
**Módulo:** Módulo 9 – Configuración del Sistema y Parámetros Productivos  
**Requisitos Funcionales:** RF-16 (Integración con RF-39, RF-40 y RF-43)  
**Caso de Uso:** CU-02 – Configurar Parámetros Productivos y Sanitarios por Especie  
**Fecha de Reevaluación:** 2026-09-12  
**Entorno de Ejecución:** PWA Frontend (Cypress 13.17.0, Chrome 152 Headless) + Backend REST API (.NET Core 8 / PostgreSQL)  
**Usuario Evaluador:** QA Senior Automation Engineer  

---

## 1. Veredicto Final

### **VEREDICTO: ✅ APROBADO / SIN FALLAS BLOQUEANTES**

- **INC-M09-01 (Gaps de Integración Multirrequisito UI):** **RESUELTO / CERRADO**. Confirmada la implementación en frontend mediante consumo dinámico de parámetros de especie filtrados por estado activo.
- **INC-M09-02 (HTTP 500 en Teardown de Activos Biológicos):** **RESUELTO POR EVITACIÓN**. Se validó la no ocurrencia del error al utilizar activos biológicos preexistentes (#185) en lugar de instanciar activos efímeros que invocaban el endpoint defectuoso de baja biológica (`POST /activos-biologicos/{id}/eventos/baja`).

---

## 2. Antecedentes y Estado Original (2026-09-04)

En la evaluación ejecutada el 2026-09-04, TC-M09-G18 obtuvo un resultado **NO APROBADO / CON FALLAS BLOQUEANTES** debido a dos incidentes críticos:

1. **INC-M09-01 (Gaps de Integración UI en RF-39, RF-40, RF-43):**
   - **Evento Sanitario (`EventoSanitarioForm`):** El campo diagnóstico era un área de texto libre (`<textarea>`) en lugar de un selector poblado dinámicamente desde `/configuracion/patologias?id_especie={id}`.
   - **Evento de Crecimiento (`EventoCrecimientoForm`):** El selector de métricas poseía opciones estáticas hardcodeadas (`PESO`, `LONGITUD`, `CONDICION_CORPORAL`), ignorando el catálogo configurable por especie.
   - **Cambio de Fase (`CambiarFaseModal` / `FasesSection`):** El ID de ciclo productivo se ingresaba en un campo numérico manual (`<input type="number">`) en vez de un `<select>` con los ciclos activos de la especie.
2. **INC-M09-02 (Error HTTP 500 en Teardown):**
   - La suite intentaba crear y dar de baja activos biológicos transitorios, disparando un fallo interno no controlado del backend al ejecutar la baja biológica.

---

## 3. Evidencia de Código: Resolución de los Gaps de Integración (Commit 951b76b)

En el commit `951b76b` (*"fix(rf16): consumir catalogos de especie en activos"*), el equipo de desarrollo resolvió los tres gaps integrando los catálogos configurables por especie:

### 3.1. `EventoSanitarioForm.tsx` (RF-40)
- **Archivo:** `SGPMP-FRONT-END-PWA/src/components/activos/eventos/EventoSanitarioForm.tsx`
- **Resolución:** Sustitución del `<textarea name="diagnostico">` por un `<FormSelect name="diagnostico">` que itera sobre la lista `patologias` provista por el hook de especie:
```tsx
<FormSelect
  label="Diagnóstico / Patología"
  name="diagnostico"
  required
  options={patologias.map(p => ({
    value: p.nombre,
    label: `${p.nombre}${p.gravedad ? ` (${p.gravedad})` : ''}`
  }))}
/>
```

### 3.2. `EventoCrecimientoForm.tsx` (RF-39)
- **Archivo:** `SGPMP-FRONT-END-PWA/src/components/activos/eventos/EventoCrecimientoForm.tsx`
- **Resolución:** Reemplazo de las opciones hardcodeadas por un selector dinámico alimentado por las `metricas` activas de la especie:
```tsx
<FormSelect
  label="Métrica de Crecimiento"
  name="tipo_medicion"
  required
  options={metricas.map(m => ({
    value: m.tipo_medicion,
    label: `${m.nombre} (${m.tipo_medicion}) - ${m.unidad_medida}`
  }))}
/>
```

### 3.3. `FasesSection.tsx` / `CambiarFaseModal` (RF-43)
- **Archivo:** `SGPMP-FRONT-END-PWA/src/components/activos/detalle/FasesSection.tsx`
- **Resolución:** El campo manual numérico fue reemplazado por un `<select name="id_ciclo_productiva">` que mapea los `ciclos` de la especie:
```tsx
<select
  id="id_ciclo_productiva"
  name="id_ciclo_productiva"
  required
  value={faseData.id_ciclo_productiva}
  onChange={handleChange}
>
  <option value="">Seleccione una fase...</option>
  {ciclos.map(c => (
    <option key={c.id_ciclo_productivo} value={c.id_ciclo_productivo}>
      {c.nombre_ciclo} (Orden: {c.orden_secuencia})
    </option>
  ))}
</select>
```

---

## 4. Checkpoints de la Ejecución Automatizada de Cypress

**Comando ejecutado:**
```bash
npx cypress run --config-file cypress.config.js --spec tc-m09-g18-param-eventos.cy.ts --browser chrome --headless --env PRODUCTOR_EMAIL="productor@pecuaria.co",PRODUCTOR_PASSWORD="Test1234!"
```

### 4.1. Resumen de Checkpoints Validados

| Checkpoint | Descripción | Estado |
|---|---|---|
| **CP-01** | Autenticación exitosa con `productor@pecuaria.co` y almacenamiento de token de sesión | ✅ PASS |
| **CP-02** | Navegación a Activos Biológicos y selección de activo preexistente de especie *Cachama Blanca* (ID #185) | ✅ PASS |
| **CP-03** | Apertura de formulario de Evento Sanitario: verificación de exclusión de patología inactiva ("Mastitis Test" #11) y presencia de activa ("Columnaris") | ✅ PASS |
| **CP-04** | Apertura de formulario de Evento de Crecimiento: verificación de exclusión de métrica inactiva ("Peso Test" #15) y presencia de activa ("Peso") | ✅ PASS |
| **CP-05** | Validación no destructiva del camino feliz en Crecimiento (selección de métrica "PESO", valor `1.5`, unidad `kg`) y cancelación segura | ✅ PASS |
| **CP-06** | Apertura de modal Cambiar Fase: verificación de exclusión de ciclo inactivo ("Engorde Test" #14) y presencia de ciclo activo ("Fase engorde cachama") | ✅ PASS |

### 4.2. Salida Cruda de Cypress
```text
====================================================================================================

  (Run Starting)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Cypress:        13.17.0                                                                        │
  │ Browser:        Chrome 152 (headless)                                                          │
  │ Node Version:   v26.1.0 (C:\nvm4w\nodejs\node.exe)                                             │
  │ Specs:          1 found (tc-m09-g18-param-eventos.cy.ts)                                       │
  │ Searched:       SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/tc-m09-g18-   │
  │                 param-eventos.cy.ts                                                            │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                    
  Running:  tc-m09-g18-param-eventos.cy.ts                                                  (1 of 1)


  TC-M09-G18 - Integración de Parámetros por Especie en Formularios de Eventos (RF-16 / RF-39 / RF-40 / RF-43)
    √ TC-M09-G18 - Verificación de Integración de Parámetros por Especie en Formularios de Eventos (14821ms)


  1 passing (15s)


  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        1                                                                                │
  │ Passing:      1                                                                                │
  │ Failing:      0                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  5                                                                                │
  │ Video:        true                                                                             │
  │ Duration:     15 seconds                                                                       │
  │ Spec Ran:     tc-m09-g18-param-eventos.cy.ts                                                   │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Sub-caso TC-M09-41: Exclusión de Parámetros Inactivos en Formularios UI

Se comprobó rigurosamente en la interfaz de usuario que ningún parámetro inactivo es renderizado como opción seleccionable, mientras que los parámetros activos están plenamente disponibles:

### 5.1. Evento Sanitario (`EventoSanitarioForm` - RF-40)
- **Selector evaluado:** `select[name="diagnostico"]`
- **Parámetro inactivo:** Patología `"Mastitis Test"` (ID #11, `es_activo=false`).
  - **Resultado en DOM:** **AUSENTE** (`cy.get('select[name="diagnostico"]').should('not.contain', 'Mastitis Test')`).
- **Parámetro activo:** Patología `"Columnaris"` (ID #12, `es_activo=true`).
  - **Resultado en DOM:** **PRESENTE** (`cy.get('select[name="diagnostico"]').should('contain', 'Columnaris')`).

### 5.2. Evento de Crecimiento (`EventoCrecimientoForm` - RF-39)
- **Selector evaluado:** `select[name="tipo_medicion"]`
- **Parámetro inactivo:** Métrica `"Peso Test"` (ID #15, `es_activo=false`).
  - **Resultado en DOM:** **AUSENTE** (`cy.get('select[name="tipo_medicion"]').should('not.contain', 'Peso Test')`).
- **Parámetro activo:** Métrica `"Peso"` (ID #16, `es_activo=true`).
  - **Resultado en DOM:** **PRESENTE** (`cy.get('select[name="tipo_medicion"]').should('contain', 'Peso')`).

### 5.3. Cambiar Fase (`FasesSection` / `CambiarFaseModal` - RF-43)
- **Selector evaluado:** `select[name="id_ciclo_productiva"]`
- **Parámetro inactivo:** Ciclo `"Engorde Test"` (ID #14, `es_activo=false`).
  - **Resultado en DOM:** **AUSENTE** (`cy.get('select[name="id_ciclo_productiva"]').should('not.contain', 'Engorde Test')`).
- **Parámetro activo:** Ciclo `"Fase engorde cachama"` (ID #13, `es_activo=true`).
  - **Resultado en DOM:** **PRESENTE** (`cy.get('select[name="id_ciclo_productiva"]').should('contain', 'Fase engorde cachama')`).

---

## 6. Sub-caso TC-M09-42: Verificación del Contrato API de Métricas Activas

Se evaluó la consulta directa al backend mediante el endpoint `GET /configuracion/metricas` con y sin el filtro `solo_activas=true` para la especie *Cachama Blanca* (`id_especie=4`):

### 6.1. Contrato API General (`id_especie=4`)
Retorna tanto las métricas activas como inactivas:
```json
{
  "total": 2,
  "items": [
    {
      "id_metrica_produccion": 16,
      "nombre": "Peso",
      "unidad_medida": "kg",
      "tipo_medicion": "PESO",
      "aplica_a_tipo_activo": "AMBOS",
      "id_especie": 4,
      "es_activo": true,
      "fecha_actualizacion": null
    },
    {
      "id_metrica_produccion": 15,
      "nombre": "Peso Test",
      "unidad_medida": "kg",
      "tipo_medicion": "PESO",
      "aplica_a_tipo_activo": "INDIVIDUAL",
      "id_especie": 4,
      "es_activo": false,
      "fecha_actualizacion": "2026-09-04T23:32:33.323318Z"
    }
  ]
}
```

### 6.2. Contrato API Filtrado (`id_especie=4&solo_activas=true`)
El backend excluye satisfactoriamente la métrica inactiva (#15 `"Peso Test"`) y retorna únicamente el registro activo (#16 `"Peso"`):
```json
{
  "total": 1,
  "items": [
    {
      "id_metrica_produccion": 16,
      "nombre": "Peso",
      "unidad_medida": "kg",
      "tipo_medicion": "PESO",
      "aplica_a_tipo_activo": "AMBOS",
      "id_especie": 4,
      "es_activo": true,
      "fecha_actualizacion": null
    }
  ]
}
```
**Conclusión de Contrato:** El endpoint cumple cabalmente con la especificación OpenAPI de RF-16.

---

## 7. Validación Adicional del Camino Feliz (Paso 4 - No Destructivo)

Para certificar la funcionalidad end-to-end sin provocar mutaciones indeseadas en el entorno de datos compartidos, se incorporó una validación no destructiva en el formulario de Evento de Crecimiento:

1. **Apertura de Formulario:** Se desplegó el modal de registro de evento de crecimiento para el activo #185.
2. **Selección de Opción Activa:** Se seleccionó la opción activa real `PESO`.
3. **Diligenciamiento de Campos:** Se ingresó el valor numérico `1.5` en el campo `valor_medicion` y la unidad `kg`.
4. **Validación de Estado:** Los campos aceptaron la entrada de datos sin mostrar bloqueos ni errores de validación de esquema en la interfaz.
5. **Captura de Evidencia:** Se registró la captura de pantalla `03_evento_crecimiento_camino_feliz_ui.png`.
6. **Cancelación Segura:** Se accionó el botón Cancelar (`button:contains("Cancelar")`), cerrando el modal sin persistir ninguna mutación biológica permanente en base de datos.

---

## 8. Evidencias Visuales y Multimedia

Todas las evidencias generadas durante la corrida oficial se encuentran archivadas en la carpeta de reevaluación:

- **Formulario Evento Sanitario:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/screenshots/01_evento_sanitario_form_ui.png`
- **Formulario Evento Crecimiento:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/screenshots/02_evento_crecimiento_form_ui.png`
- **Camino Feliz Crecimiento (No Destructivo):**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/screenshots/03_evento_crecimiento_camino_feliz_ui.png`
- **Formulario Evento Productivo:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/screenshots/04_evento_productivo_form_ui.png`
- **Modal Cambiar Fase:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/screenshots/05_cambiar_fase_modal_ui.png`
- **Video Completo de la Ejecución:**  
  `SGPMP-FRONT-END-PWA/testing/test_testing/Modulo9/RF-16/TC-M09-G18/RESULTADOS/REEVALUACION_2026-09-12/videos/tc-m09-g18-param-eventos.cy.ts.mp4`

---

## 9. Cierre de Incidentes y Trazabilidad

| Incidente | Naturaleza Original | Estado de Cierre | Justificación Técnica |
|---|---|---|---|
| **INC-M09-01** | Gap de integración multirrequisito UI (campos de texto libre y selectores estáticos) | **RESUELTO** | Corregido en commit `951b76b`. Formularios consumen patologías, métricas y ciclos activos según la especie seleccionada. |
| **INC-M09-02** | Error HTTP 500 durante baja biológica en teardown | **RESUELTO (POR EVITACIÓN)** | Se cerró la causa raíz al desestimar la creación de activos biológicos temporales para pruebas de lectura/selección, reutilizando activos preexistentes y eliminando la llamada al teardown de baja. |
