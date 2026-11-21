# Verificación manual de CP-01 en TEST (TC-M08-G025, RF-107)

- **Fecha:** 2026-11-20, 06:53 (hora de Bogotá).
- **Ambiente:** https://api.inmero.co/sigab-test/ (API en `api-sgpmp-test`).
- **Ejecutó:** Claude, en el navegador de la app de escritorio, a pedido de Sebastian. Cuenta de Administrador «Juan Sebastian Test», id_usuario 93; Sebastian inició la sesión.
- **Alcance:** fuera de sandbox. Se creó un activo real en TEST con un identificador de QA.

## Datos del registro

| Campo | Valor |
|---|---|
| Tipo | Individual |
| Especie | Cachama Blanca (#4) |
| Finca | Finca QA (34) |
| Infraestructura | QA-M09-desbloqueo-1791600840 (#277) |
| Fecha de inicio de ciclo | 2026-11-19 |
| Origen | Compra |
| Costo de adquisición | 1639000 |
| Soporte documental | «Factura QA-M08-G025» |
| Identificador | QA-M08-G025-001 |
| Raza | Cachama |
| Sexo | Macho |

## Resultado

1. **Respuesta del servidor:** `POST /activos-biologicos` → **201**.
   - id_activo_biologico = **2944**
   - identificador = «QA-M08-G025-001»
   - costo_adquisicion = **"1639000.0000"** (llega como texto decimal)
   - origen_financiero = «compra»
   - fecha_creacion = 2026-11-20T11:53:00.775588Z
2. **Aviso de éxito en pantalla** (texto leído del DOM con un MutationObserver; clase `ds-alert ds-alert--success`):

   **«Registrado correctamente QA-M08-G025-001»**

3. **Esperado** (RF-107, sección 8.5, plantilla fija REGISTRO_ACTIVO):

   «El activo QA-M08-G025-001 fue registrado correctamente. Valor inicial reconocido: $1.639.000 COP.»

**Conclusión:** confirma en TEST lo que dio la corrida oficial `qa-m08-g025-20261120-062204` en CP-01. El servidor entrega el costo de adquisición y el aviso no lo muestra ni usa la plantilla.

## Hecho accesorio (observación, no es checkpoint)

Un primer intento en la infraestructura #271 respondió **422**. Se mostró dentro del formulario un aviso de advertencia (`ds-alert--warning`, no el banner de M08):

> «No se pudo registrar el activo Configuración faltante: la especie 'Ave Qa Je' no tiene densidad poblacional máxima (ind/m²) definida. Configúrela en el catálogo de especies antes de operar la capacidad del área.»

Es un problema de configuración de datos en TEST, no de RF-107.

## Baja del activo 2944 (a pedido de Sebastian, 2026-11-20 06:56)

Pasos en la pestaña Eventos:

1. Se pulsó «Baja».
2. Formulario:
   - Tipo: Pérdida
   - Fecha: 2026-11-20
   - Motivo: «Baja de verificacion QA TC-M08-G025 (RF-107). Activo de prueba creado el 20/11/2026.»
3. Se pulsó «Registrar baja» y apareció el paso «Confirma la baja», con los botones «Volver» y «Confirmar baja».

### Escape en el paso de confirmación

**Primer intento:** en el paso «Confirma la baja» se pulsó **Escape** y el diálogo **se cerró**.

- No se envió ninguna petición: el activo siguió en ACTIVO y no hubo POST de la baja.
- El código declara ese paso como bloqueante (`RegistrarBajaModal.tsx`, encabezado y línea 78: `bloqueante={pendiente !== null}`), y v7 dice que los modales críticos no se cierran con Escape.
- El bundle de TEST (`index-CyFbOmNY.js`) contiene #693: `bloqueante` y `ds-toasts__saturacion` están presentes.

**Causa probable (observada en el código, la confirma Desarrollo):** en `shared/hooks/useModalA11y.ts`:55-102, `permiteEscape` se calcula al montar y el `useEffect` tiene dependencias `[]`. El modal de baja se monta con `bloqueante=false` (paso del formulario) y pasa a `true` en el paso de confirmación, pero el manejador de teclado conserva el valor inicial, así que Escape sigue cerrando.

**Alcance:** corresponde a TC-M08-069 / TC-M08-070 (grupos **G028 y G029**), no a G025. Se usa como dato de diseño para esos grupos.

### Segundo intento: confirmación

- Se volvió a abrir el diálogo y se pulsó «Confirmar baja».
- **Respuesta del servidor:** `POST /activos-biologicos/2944/eventos/baja` → **201**, con `id_eventos` 2683, tipo «perdida», cantidad_afectada 1 y fecha 2026-11-20T11:56:30Z.
- **Estado posterior del activo:** **Baja**.

**Aviso de éxito en pantalla:** `ds-alert--success` **dentro de la sección Eventos**, no en el banner global de M08, con el texto:

> «Evento registrado Baja registrada.»

El texto sale de `EventosSection.tsx`:204 y :316.

- RF-107 no da plantilla para la baja.
- CA-09 pide un mensaje con datos de la operación, y TC-M08-070 (b) pide un banner de éxito con datos de la acción.
- **Alcance:** observación para **G029**; no cuenta en G025.

## Estado final de los datos en TEST

- El activo **2944** (QA-M08-G025-001, Finca QA 34, infraestructura #277) queda en estado **Baja**, con el evento 2683.
- La baja es irreversible y pudo generar notificaciones de RF-105.
