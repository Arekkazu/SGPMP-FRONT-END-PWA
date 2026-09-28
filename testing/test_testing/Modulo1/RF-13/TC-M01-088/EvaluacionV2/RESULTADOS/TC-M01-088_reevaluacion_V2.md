# TC-M01-088 — REEVALUACIÓN V2

RF-13 — Perfil sin exponer el ID de usuario en la URL
Fecha: 2026-09-15 · Entorno decisorio: TEST

## DECISIÓN GENERAL

### REEVALUACIÓN: DEFECTO REAL CONFIRMADO — NO APROBADO

La evidencia V1 apuntaba a `http://localhost:8000/api` y `http://localhost:5174`
(ambiente local, no TEST), con `Login: POST .../sesiones/ -> HTTP 403`. Se
reejecutó contra TEST real (`admin.dev@gmail.com`) para descartar que fuera
solo un problema de ambiente — pero al hacerlo se encontró un **defecto real
de producto**, distinto del original.

## CAUSA RAÍZ CONFIRMADA (reproducida también por curl, fuera de Cypress)

1. Login exitoso: `POST /sesiones/` → 200, `GET /usuarios/me` → 200.
2. `cy.visit('/perfil')` provoca una recarga completa de página. Según el
   propio `CLAUDE.md` del frontend, el access token vive **solo en memoria**
   (nunca en `localStorage`), así que una recarga completa lo pierde — esto
   es comportamiento esperado por diseño.
3. Para no perder la sesión, el frontend debe llamar `POST /sesiones/refresh`
   (la cookie httpOnly del refresh token viaja sola). En esta corrida, esa
   llamada devolvió **HTTP 500**.
4. Reproducido de forma aislada con `curl` (cookie real de un login limpio):

   ```json
   {
     "error_code": "AUDITORIA_OBLIGATORIA_FALLIDA",
     "message": "Fallo crítico de seguridad: No se pudo generar el registro de auditoría obligatorio. La operación REFRESH_TOKEN_ROTADO ha sido cancelada para garantizar la trazabilidad del sistema."
   }
   ```

5. **Causa raíz identificada en código (solo lectura, sin cambios):**
   `refresh_token_use_case.py` usa `TIPO_REFRESH_TOKEN_ROTADO = 23` para
   registrar la auditoría obligatoria del refresh. Verificado contra
   `modulo1.tipos_eventos` en TEST (solo lectura): **el id 23 no existe en el
   catálogo** — la tabla salta de 22 (`PROVISION_AGROFUSION_SYNC`) a 25
   (`FALLO_ARCHIVADO_AUDITORIA`). La escritura del evento de auditoría falla
   (referencia a un tipo de evento inexistente), el `try/except` genérico de
   `evento_repository.py` lo atrapa y lo traduce a `AUDITORIA_OBLIGATORIA_FALLIDA`
   (500), y el use case cancela toda la operación de refresh.

## IMPACTO

**Severo, afecta a todos los usuarios.** Cualquier pérdida del access token en
memoria (recarga de página, expiración a las `JWT_EXPIRE_HOURS`) fuerza un
re-login completo en vez de una renovación silenciosa — el mecanismo que el
propio `CLAUDE.md` documenta como el propósito de la cookie de refresh queda
inoperante en TEST.

## Por qué TC-M01-088 no puede aprobarse tal como está

El caso original asume que `/perfil` sigue accesible después de una recarga.
Esa asunción es correcta según el diseño documentado (el refresh debería
cubrir la pérdida del token en memoria), pero el mecanismo real está roto. El
fallo no es de la prueba ni del ambiente: es un defecto de producto.

## DEFECTO DETECTADO — DEBE REGISTRARSE COMO INCIDENCIA

- **Título:** `POST /sesiones/refresh` falla siempre con HTTP 500
  (`AUDITORIA_OBLIGATORIA_FALLIDA`) por un tipo de evento de auditoría
  (`REFRESH_TOKEN_ROTADO`, id 23) no sembrado en `modulo1.tipos_eventos`.
- **RF relacionados:** RF-02 (autenticación / ciclo de vida del JWT) y RF-13
  (indirectamente, cualquier caso que dependa de sesión persistente tras
  recarga).
- **Categoría:** `INFRAESTRUC` / gap de datos de catálogo (ver CLAUDE.md
  backend, "Paso 0 — Análisis de gaps de BD").
- **Equipo responsable:** Desarrollo Backend (sembrar la fila faltante en
  `modulo1.tipos_eventos` para id 23, y revisar si el 24 también falta).
- **Pasos de reproducción:**
  1. Login real (`POST /sesiones/`), capturar la cookie `refresh_token`.
  2. `POST /sesiones/refresh` con esa cookie.
  3. Obtener 500 `AUDITORIA_OBLIGATORIA_FALLIDA` de forma consistente.
- **Esperado:** HTTP 200 con un access token nuevo.
- **Obtenido:** HTTP 500, sin rotar el token, sesión perdida.
- **Reproducibilidad:** 100% (probado también por curl, fuera de cualquier
  test de Cypress, dos veces).
- **Evidencia:** video y screenshot de esta corrida en `RESULTADOS/`;
  respuesta cruda del `curl` documentada arriba.
- **Severidad sugerida:** Severo (hay alternativa manual — re-login — pero
  RF-02 exige la renovación silenciosa).

## Seguridad

- Solo lectura de código y de `modulo1.tipos_eventos` vía conexión
  `member_qa` (`default_transaction_read_only=on`). Ninguna escritura.
- No se modificó código, infraestructura ni datos.

## Estado de cierre

TC-M01-088 reevaluado: **NO APROBADO — DEFECTO REAL DE PRODUCTO**, distinto
del motivo original (que sí era ambiente/ejecución). Reportar a Desarrollo
Backend según el defecto detectado arriba.
