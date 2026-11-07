# Fase 1C: Re-verificación de Código y Sondeo de Datos en TEST (RF-81 / TC-M05-G41)

**Caso de Prueba Agrupado:** TC-M05-G41 (Casos base: TC-M05-098, TC-M05-099, TC-M05-104)  
**Requisito Funcional:** RF-81 — Consulta de historial de suministros por activo (Módulo 5: Suministros)  
**Ambiente de Evaluación:** TEST (`https://api.inmero.co/api-sgpmp-test` / Frontend oficial: `https://api.inmero.co/sigab-test/`)  
**Fecha de Ejecución:** 2026-11-07  
**Estado General de la Fase:** COMPLETADA — Puerta 2.2 Activada (Detención inmediata por 404 en los 3 activos conocidos)

---

## 1. Resumen Ejecutivo (≤ 10 líneas)

1. Se rectificaron las discrepancias de Fase 1B: el router real es `src/supplies/infrastructure/routers/historial_suministros_router.py` y el caso de uso es `src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py`; la ruta `src/modulos/...` citada en 1B no existe.
2. La línea exacta donde se define `datos_contexto_no_disponibles=False` es la **177** de `consultar_historial_suministros_use_case.py` (confirmando Fase 1 y refutando línea 126 de 1B).
3. La auditoría `CONSULTA_HISTORIAL_EJECUTADA` se emite en las líneas 189-205 del caso de uso usando la misma sesión SQLAlchemy (`self.db`) y conexión física de la consulta.
4. El backend no utiliza la cabecera `X-Sandbox-Mode`; las cabeceras reales son `X-Test-Run-Id` y `X-Sandbox-Secret`.
5. En el frontend ([`HistorialView.tsx:157-185`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L157-L185)), los textos i18n reales son `"Elige un activo"` (sin filtro) y `"Sin suministros con esos filtros"` (lista vacía), ratificando el reporte de Fase 1.
6. El inventario de semillas `INVENTARIO_SEED_M05.md` y su script `verificar_seed_m05.py` residen en el **backend** (`tests/Test_Testing/Test_Modulo5/`), no en el frontend.
7. En el sondeo de Bloque 2, los activos conocidos 778, 776 y 296 respondieron **404 ACTIVO_NO_ENCONTRADO** de forma unánime.
8. **Activación de Puerta 2.2:** La respuesta 404 en los 3 activos detuvo inmediatamente el resto del Bloque 2, confirmando que en G13 dichos activos fueron efímeros creados bajo sandbox transaccional con rollback posterior.
9. **Viabilidad de TC-M05-098 / 099 / 104:** La ausencia total de activos biológicos permanentes en TEST hace obligatorio el uso de `cy.intercept` en Cypress para simular respuestas de historial, o la aplicación previa del script SQL por DBA.

---

## 2. Bloque 1 — Re-verificaciones de Código (Solo Lectura)

### 1.1 Rutas Reales en el Backend
Mediante introspección en el repositorio `sgpmp-backend`, se localizaron las rutas exactas de los componentes de RF-81:
- **Router de GET `/suministros/historial`:**  
  `C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\routers\historial_suministros_router.py` (líneas 59, 90-142).
- **Caso de uso `ConsultarHistorialSuministrosUseCase`:**  
  `C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\application\use_cases\historial_suministros\consultar_historial_suministros_use_case.py`.
- **Función que emite `CONSULTA_HISTORIAL_EJECUTADA`:**  
  Método privado `_auditar_consulta()` ubicado en [`consultar_historial_suministros_use_case.py:189-205`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L189-L205).
- **Confirmación sobre archivo citado en Fase 1B:**  
  El archivo `src/modulos/suministros/infraestructura/api/v1/endpoints/suministros.py` **NO EXISTE**. La carpeta `src/modulos` no existe en `sgpmp-backend` (`Test-Path 'src\modulos'` retorna `False`). Toda la arquitectura del módulo de suministros reside bajo `src/supplies/`.

### 1.2 Línea Exacta de `datos_contexto_no_disponibles`
Se ejecutó la búsqueda textual en el caso de uso y en el repositorio:
```python
# C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\application\use_cases\historial_suministros\consultar_historial_suministros_use_case.py
170:         resumen = ResumenConsultaHistorial(
171:             total_registros_filtrados=resultado.total_registros_filtrados,
172:             monto_total_filtrado=resultado.monto_total_filtrado,
173:             desglose_por_tipo_suministro=resultado.desglose_por_tipo_suministro,
174:             desglose_por_ciclo=resultado.desglose_por_ciclo,
175:             pagina_actual=filtros.pagina,
176:             total_paginas=total_paginas,
177:             datos_contexto_no_disponibles=False,
178:             datos_actualizados_hasta=datetime.now(timezone.utc),
179:             nivel_volumen=nivel.value,
```
- **Aclaración de discrepancia:** La línea **177** reportada en la Fase 1 es la **CORRECTA**. La línea 126 citada en el informe de Fase 1B correspondía a `return self._asincrona(filtros, id_usuario, id_rol, nivel, total_historico)`.
- **En el frontend:** El campo se consume en [`src/supplies/pages/HistorialView.tsx:178`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L178):
  ```tsx
  178:                 {resumen.datos_contexto_no_disponibles && ` · ${t('historial.sin_contexto')}`}
  ```

### 1.3 Auditoría de Consultas
Código literal de [`consultar_historial_suministros_use_case.py:186-205`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/historial_suministros/consultar_historial_suministros_use_case.py#L186-L205):
```python
186:         self._auditar_consulta(filtros, id_usuario)
187:         return ResultadoConsultaHistorial(lineas=resultado.lineas, resumen=resumen)
188: 
189:     def _auditar_consulta(self, filtros: FiltrosHistorialSuministro, id_usuario: int) -> None:
190:         try:
191:             self.auditoria_port.registrar(
192:                 EventoAuditoriaSuministro(
193:                     entidad_afectada="historial_suministros",
194:                     tipo_operacion="CONSULTA_HISTORIAL_EJECUTADA",
195:                     id_usuario=id_usuario,
196:                     resultado="EXITOSO",
197:                     id_activo_biologico=filtros.id_activo_biologico,
198:                     id_ciclo_productivo=filtros.id_ciclo_productivo,
199:                 )
200:             )
201:             self.db.commit()
202:         except Exception:
203:             self.db.rollback()
204:             logger.exception("Error al auditar CONSULTA_HISTORIAL_EJECUTADA para activo %s", filtros.id_activo_biologico)
205: 
```
- **Sesión y conexión:** En [`historial_suministros_factory.py:60-69`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/factories/historial_suministros_factory.py#L60-L69), la fábrica inyecta `db=db` y `auditoria_port=SqlAlchemyAuditoriaSuministroRepository(db)` utilizando exactamente la misma instancia de `Session` de SQLAlchemy proveniente de `get_db`. Por ende, la auditoría se ejecuta sobre la **misma sesión y conexión transaccional** que la lectura del historial.

### 1.4 Mecanismo del Sandbox Transaccional
- **Ubicación del middleware:** [`src/shared/rollback/infraestructure/testing_middlaware.py:12-39`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/shared/rollback/infraestructure/testing_middlaware.py#L12-L39):
  ```python
  12: class TestSandboxMiddleware(BaseHTTPMiddleware):
  13:     async def dispatch(self, request: Request, call_next) -> Response:
  14:         if os.getenv("ENABLE_TEST_SANDBOX", "false").lower() != "true":
  15:             return await call_next(request)
  16: 
  17:         run_id = request.headers.get("X-Test-Run-Id")
  18:         if not run_id:
  19:             return await call_next(request)
  20: 
  21:         secret = request.headers.get("X-Sandbox-Secret")
  22:         expected_secret = os.getenv("TEST_SANDBOX_SECRET")
  23:         if not expected_secret or secret != expected_secret:
  24:             return Response(
  25:                 content="Acceso denegado. Secreto de sandbox inválido o ausente.",
  26:                 status_code=403,
  27:             )
  ```
- **Cabecera "X-Sandbox-Mode":** **NO EXISTE** en el código del backend (`sgpmp-backend`).
- **Análisis técnico:**
  - **(a) Conexión y transacción:** En [`testing_sandbox.py:49-56`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/src/shared/rollback/infraestructure/testing_sandbox.py#L49-L56), se inicializa una única conexión persistente: `connection = engine.connect()`, `transaction = connection.begin()`, y `session = SessionLocal(bind=connection, join_transaction_mode="create_savepoint")`. Todas las peticiones con el mismo `X-Test-Run-Id` reutilizan esta conexión física almacenada en `active_test_transactions[run_id]`.
  - **(b) Visibilidad interna:** **SÍ**. Un GET con el mismo `X-Test-Run-Id` ve los datos creados antes dentro del mismo run porque comparte la misma conexión física y transacción de PostgreSQL.
  - **(c) Aislamiento externo:** **NO**. Una petición sin la cabecera obtiene una conexión independiente del pool (`SessionLocal()`). Por el nivel de aislamiento de PostgreSQL (Read Committed), no puede ver los cambios no confirmados de la transacción del sandbox.
  - **(d) Reversión de auditoría:** **SÍ**. En el sandbox, `self.db.commit()` solo confirma el savepoint de la sesión. Al finalizar el run, `cleanup_test_session()` ejecuta `entry['transaction'].rollback()`, deshaciendo todos los registros de la transacción, incluidos los eventos de auditoría.

### 1.5 Frontend: Renderizado e i18n
Código literal de [`src/supplies/pages/HistorialView.tsx:157-185`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/pages/HistorialView.tsx#L157-L185):
```tsx
157:       {!filtros ? (
158:         <EstadoVacio icono={<History size={28} aria-hidden />} titulo={t('historial.vacio_titulo')} detalle={t('historial.vacio_detalle')} />
159:       ) : pagina && (
160:         <>
161:           {resumen && (
162:             <section aria-label={t('historial.resumen')} style={{ ...PANEL, marginBottom: 'var(--s4)', display: 'flex', gap: 'var(--s6)', flexWrap: 'wrap' }}>
163:               <div>
164:                 <p style={{ margin: 0, fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{t('historial.monto_total')}</p>
165:                 <p style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatoMoneda(resumen.monto_total_filtrado)}</p>
166:                 <p style={{ ...SECUNDARIO, margin: 'var(--s1) 0 0' }}>{t('comun.registros', { count: resumen.total_registros_filtrados })}</p>
167:               </div>
...
176:               <p style={{ ...SECUNDARIO, margin: 0, flexBasis: '100%' }}>
177:                 {t('historial.actualizado', { fecha: formatoFecha(resumen.datos_actualizados_hasta, true) })}
178:                 {resumen.datos_contexto_no_disponibles && ` · ${t('historial.sin_contexto')}`}
179:               </p>
180:             </section>
181:           )}
182:           {resumen?.mensaje && <Alert variant="info" title={resumen.mensaje} style={{ marginBottom: 'var(--s4)' }} />}
183:           {pagina.items.length === 0 ? (
184:             <EstadoVacio icono={<History size={28} aria-hidden />} titulo={t('historial.sin_resultados')} detalle={t('historial.sin_resultados_detalle')} />
185:           ) : (
```
- **Claves y Literales i18n:**
  - Archivos: [`src/shared/i18n/locales/es-CO/supplies.json:327-350`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/shared/i18n/locales/es-CO/supplies.json#L327-L350) y [`en-US/supplies.json:327-350`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/shared/i18n/locales/en-US/supplies.json#L327-L350).
  - **Estado Inicial sin Activo (`!filtros`):**
    - `es-CO`: `"vacio_titulo": "Elige un activo"`, `"vacio_detalle": "El historial se consulta por activo; los demás filtros son opcionales."`
    - `en-US`: `"vacio_titulo": "Choose an asset"`, `"vacio_detalle": "The history is looked up per asset; the other filters are optional."`
  - **Estado Filtrado sin Registros (`pagina.items.length === 0`):**
    - `es-CO`: `"sin_resultados": "Sin suministros con esos filtros"`, `"sin_resultados_detalle": "Amplía el rango de fechas o quita filtros."`
    - `en-US`: `"sin_resultados": "No supplies match those filters"`, `"sin_resultados_detalle": "Widen the date range or remove filters."`
  - **"Datos hasta":**
    - `es-CO`: `"actualizado": "Datos hasta {{fecha}}"`
    - `en-US`: `"actualizado": "Data up to {{fecha}}"`
  - **Aviso `datos_contexto_no_disponibles`:**
    - `es-CO`: `"sin_contexto": "algunos datos de contexto (activo, ciclo) no están disponibles"`
    - `en-US`: `"sin_contexto": "some context data (asset, cycle) is unavailable"`
- **Conclusión de la contradicción:** El informe de Fase 1 tenía los textos **CORRECTOS** presentes en el código. El informe 1B citó traducciones inexistentes.

### 1.6 Archivos de Entorno del Frontend
Rutas absolutas y nombres de variables de cada archivo `.env*` existente en `SGPMP-FRONT-END-PWA`:
1. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.example`:
   `VITE_API_BASE_URL`, `VITE_RECAPTCHA_SITE_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_VAPID_KEY`, `VITE_AGROFUSION_LOGIN_URL`, `VET_EMAIL`, `VET_PASSWORD`.
2. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test`:
   `VITE_API_BASE_URL`, `VITE_RECAPTCHA_SITE_KEY`, `ENABLE_TEST_SANDBOX`, `TEST_SANDBOX_SECRET`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD`, `VET_EMAIL`, `VET_PASSWORD`, `GESTOR_GRANJA_EMAIL`, `GESTOR_GRANJA_PASSWORD`, `REVISOR_FISCAL_EMAIL`, `REVISOR_FISCAL_PASSWORD`, `INGENIERO_CAMPO_EMAIL`, `INGENIERO_CAMPO_PASSWORD`, `CONTADOR_EMAIL`, `CONTADOR_PASSWORD`, `PRODUCTOR_EMAIL`, `PRODUCTOR_PASSWORD`.
3. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test.example`:
   `VITE_API_BASE_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_VAPID_KEY`, `VITE_RECAPTCHA_SITE_KEY`.
4. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\.env.test`:
   `ENABLE_TEST_SANDBOX`, `TEST_SANDBOX_SECRET`, `API_BASE_URL`, `FRONT_BASE_URL`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD`.
5. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\.env.test.example`:
   `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `TEST_SUPERVISOR_EMAIL`, `TEST_SUPERVISOR_PASSWORD`, `TEST_PRODUCTOR_EMAIL`, `TEST_PRODUCTOR_PASSWORD`, `TEST_GESTOR_GRANJA_EMAIL`, `TEST_GESTOR_GRANJA_PASSWORD`, `TEST_REVISOR_FISCAL_EMAIL`, `TEST_REVISOR_FISCAL_PASSWORD`, `TEST_CONTADOR_EMAIL`, `TEST_CONTADOR_PASSWORD`, `TEST_VETERINARIO_EMAIL`, `TEST_VETERINARIO_PASSWORD`, `TEST_INGENIERO_CAMPO_EMAIL`, `TEST_INGENIERO_CAMPO_PASSWORD`, `TEST_EXTERNO_AGROFUSION_EMAIL`, `TEST_EXTERNO_AGROFUSION_PASSWORD`.
6. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo2\RF-36\TC-M02-G24\.env.test`:
   `BASE_URL`, `API_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_ADMIN_PASSWORD`.
7. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-15\TC-M09-G01-v2.0\.env.test`:
   `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ENV_TARGET`.
8. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-15\TC-M09-G03-v2.0\.env.test`:
   `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ENV_TARGET`.
9. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-15\TC-M09-G07\.env.test`:
   `BASE_URL`, `API_BASE_URL`, `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`.
10. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-15\TC-M09-G07\.env.test.example`:
   `BASE_URL`, `API_BASE_URL`, `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`.
11. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-15\TC-M09-G07-v2.0\.env.test`:
   `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ENV_TARGET`.
12. `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\testing\test_testing\Modulo9\RF-16\TC-M09-G11-v2.0\.env.test`:
   `ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, `ENV_TARGET`.

- **(a) Archivo que lee la configuración de Cypress:**  
  En [`testing/test_testing/Modulo5/RF-76/TC-M05-G13/cypress.config.js:35-39`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-76/TC-M05-G13/cypress.config.js#L35-L39):
  ```javascript
  const ENV_LOCAL = resolve(__dirname, '.env.test');
  const ENV_RAIZ = resolve(__dirname, '../../../../../.env.test');
  const dotenv = require('dotenv');
  for (const ruta of [ENV_LOCAL, ENV_RAIZ]) {
    if (existsSync(ruta)) dotenv.config({ path: ruta, quiet: true });
  }
  ```
  La ruta resuelta `ENV_RAIZ` es: `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test`.
- **(b) Script "test" de package.json de TC-M05-G13:**  
  En [`package.json:8`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-76/TC-M05-G13/package.json#L8):
  ```json
  "test": "cross-env TZ=America/Bogota cypress run --browser chrome --spec tc-m05-g13-registro-medicamento.cy.ts"
  ```
  Delega la carga del entorno directamente a `cypress.config.js`.
- **(c) Archivo donde se escribieron las variables del Bloque A:**  
  Se escribieron en `C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\.env.test`. Por lo tanto, **SÍ quedaron en el archivo exacto que lee Cypress**.
- **(d) Causa de la discrepancia de nombres entre Fase 1 y 1B:**  
  Fase 1 reportó los nombres reales de `SGPMP-FRONT-END-PWA\.env.test`. En 1B se mezclaron los nombres de `testing\.env.test` con variables simplificadas (`FRONTEND_URL`, `SANDBOX_SECRET`).

### 1.7 Semillas e Inventario M05
- **Ruta real de `INVENTARIO_SEED_M05.md`:**  
  [`C:\Users\Juansegutt\Integrador\sgpmp-backend\tests\Test_Testing\Test_Modulo5\INVENTARIO_SEED_M05.md`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/tests/Test_Testing/Test_Modulo5/INVENTARIO_SEED_M05.md) (**Backend**, no frontend).
- **Ruta real de `verificar_seed_m05.py`:**  
  [`C:\Users\Juansegutt\Integrador\sgpmp-backend\tests\Test_Testing\Test_Modulo5\verificar_seed_m05.py`](file:///C:/Users/Juansegutt/Integrador/sgpmp-backend/tests/Test_Testing/Test_Modulo5/verificar_seed_m05.py) (**Backend**, no frontend).
- **Líneas literales de semillas para RF-81:**
  - `SEED-M05-HIST-10K` (Bloque 4, líneas 326-339):
    ```sql
    326:     SELECT id_activo_biologico INTO v_act_10k 
    327:     FROM modulo2.activos_biologicos 
    328:     WHERE identificador = 'SEED-M05-HIST-10K';
    331:     IF v_act_10k IS NULL THEN
    332:         INSERT INTO modulo2.activos_biologicos (
    333:             id_especie, identificador, id_infraestructura, tipo,
    334:             id_estado, origen_financiero, costo_adquisicion, soporte_documental,
    335:             id_usuario, fecha_creacion, fecha_inicio_ciclo
    336:         ) VALUES (
    337:             1, 'SEED-M05-HIST-10K', 6, 'INDIVIDUAL'::modulo2.enum_activo_biologico_tipo,
    338:             1, 'compra'::modulo2.enum_activo_biologico_origen_financiero, 100000.00, 'FAC-SEED-10K',
    339:             104, NOW() - INTERVAL '200 days', (CURRENT_DATE - INTERVAL '200 days')::date
    ```
    Inserta 10.000 suministros distribuidos entre fase cerrada (5.000) y fase activa (5.000), combinando 4 tipos (`ALIMENTO`, `MEDICAMENTO`, `SERVICIO_VETERINARIO`, `INSEMINACION`) y 2 orígenes de precio (`MANUAL`, `M40_AUTOMATICO`). Estado: `REQUIERE_DBA`.
  - `SEED-M05-HIST-50K` (Bloque 5, líneas 403-416):
    ```sql
    403:     SELECT id_activo_biologico INTO v_act_50k 
    404:     FROM modulo2.activos_biologicos 
    405:     WHERE identificador = 'SEED-M05-HIST-50K';
    408:         INSERT INTO modulo2.activos_biologicos (
    409:             id_especie, identificador, id_infraestructura, tipo,
    410:             id_estado, origen_financiero, costo_adquisicion, soporte_documental,
    411:             id_usuario, fecha_creacion, fecha_inicio_ciclo
    412:         ) VALUES (
    413:             1, 'SEED-M05-HIST-50K', 6, 'INDIVIDUAL'::modulo2.enum_activo_biologico_tipo, ...
    ```
    Inserta 50.000 registros para pruebas de estrés de historial batch. Estado: `REQUIERE_DBA`.
  - Otros activos definidos:
    - `SEED-M05-REP-450D` (Bloque 2, G10): Activo de 450 días para reportes anuales asíncronos. Estado: `REQUIERE_DBA`.
    - `SEED-M05-REP-500` (Bloque 3, G11): Activo con 500 consumos de alimento (borde síncrono). Estado: `REQUIERE_DBA`.
- **Resumen consolidado de las 41 semillas de M05 (`INVENTARIO_SEED_M05.md:29-37`):**
  - `EXISTE_REUTILIZABLE`: 11
  - `CREABLE_EN_SANDBOX`: 16
  - `REQUIERE_DBA`: 4
  - `EXISTE_NO_APTO`: 1
  - `NO_VERIFICABLE`: 2
  - `BLOQUEADO_POR_BACKEND`: 7

### 1.8 Commit y Fecha del Backend
- `git log -1 --format="%H %cd" origin/test`:
  `7ca523067631d92d84942a1017b070d9540d09d1 Fri Nov 6 18:06:17 2026 -0500`
- `git log -1 --format="%H %cd" HEAD`:
  `7ca523067631d92d84942a1017b070d9540d09d1 Fri Nov 6 18:06:17 2026 -0500`
- *(Aclaración: Referencias locales leídas sin ejecutar `git fetch`; representan el estado de la copia de trabajo local sincronizada al 6 de noviembre).*

### 1.9 Contrato OpenAPI
Evidencia cruda guardada en: [`diag_g41/01_openapi.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/01_openapi.json)  
(HTTP 200, hora UTC: `2026-11-07T12:15:06.497Z`, Request-ID: `04152045-85ad-4aab-be9e-4753bbcc458b`)

- **(a) Rutas GET que listan o buscan activos biológicos:**
  - `GET /activos-biologicos`
  - `GET /activos-biologicos/{id_activo}`
  - `GET /activos-biologicos/{id_activo}/historial`
  - `GET /activos-biologicos/{id_activo}/ficha-integral`
  - `GET /activos-biologicos/{id_activo}/ficha-lote`
- **(b) Rutas GET de suministros que listan registros:**
  - `GET /suministros/consumo-alimentos` (RF-75)
  - `GET /suministros/medicamentos` (RF-76)
  - `GET /suministros/costeo-directo/acumulado/activo/{id_activo_biologico}` (RF-78)
  - `GET /suministros/historial` (RF-81)
- **(c) Rutas POST que crean registros de suministro:**
  - `POST /suministros/consumo-alimentos` (RF-75)
  - `POST /suministros/medicamentos` (RF-76)
  - `POST /suministros/costeo-directo` (RF-78)

---

## 3. Bloque 2 — Datos en TEST (Solo GET)

### 2.1 Autenticación Revisor Fiscal
- **Endpoint:** `POST https://api.inmero.co/api-sgpmp-test/sesiones/`
- **Resultado HTTP:** `200 OK`
- **Request-ID:** `104180b1-bfe5-47ac-9091-f85ff6536a88`
- **Hora UTC:** `2026-11-07T12:17:19.275Z`
- **Evidencia guardada:** [`diag_g41/02_login_revisor_fiscal.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/02_login_revisor_fiscal.json) (tokens censurados con `[REDACTED]`).
- **Mensaje del Backend:** *"Sesión iniciada exitosamente. Se ha cerrado automáticamente la sesión activa en otros dispositivos por políticas de seguridad de sesión única."*

### 2.2 Sondeo de Activos Conocidos (778, 776, 296)
Se consultó el endpoint `GET /suministros/historial?id_activo_biologico={id}&registros_por_pagina=1` con la cabecera `X-Zona-Horaria: America/Bogota`:

| ID Activo | Modalidad | HTTP | Error Code | Mensaje | Latencia | Request-ID | Hora UTC | Archivo Evidencia |
| :---: | :---: | :---: | :---: | :--- | :---: | :--- | :--- | :--- |
| **778** | INDIVIDUAL | **404** | `ACTIVO_NO_ENCONTRADO` | *"El activo biológico 778 no existe."* | 194 ms | `21475378-c742-4a3a-ad21-fac86d760301` | 2026-11-07T12:17:19.474Z | [`diag_g41/03_historial_778.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/03_historial_778.json) |
| **776** | POBLACIONAL | **404** | `ACTIVO_NO_ENCONTRADO` | *"El activo biológico 776 no existe."* | 125 ms | `c7e33330-296e-48ea-82d6-ddfac6226720` | 2026-11-07T12:17:19.608Z | [`diag_g41/04_historial_776.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/04_historial_776.json) |
| **296** | POBLACIONAL | **404** | `ACTIVO_NO_ENCONTRADO` | *"El activo biológico 296 no existe."* | 117 ms | `fdd6f9ec-9986-4b27-9da0-9e7d10014521` | 2026-11-07T12:17:19.726Z | [`diag_g41/05_historial_296.json`](file:///C:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/05_historial_296.json) |

### PUERTA DE DECISIÓN ACTIVADA (Detención Inmediata)
> [!IMPORTANT] **PUERTA DE DETENCIÓN ACTIVADA:**  
> Como los **TRES** activos biológicos conocidos (778, 776 y 296) respondieron de forma unánime `404 ACTIVO_NO_ENCONTRADO`, se aplicó la regla estricta de la instrucción: **DETENERSE INMEDIATAMENTE y no ejecutar el resto del Bloque 2 (pasos 2.3 a 2.5)**.

**Explicación técnica del hallazgo:**  
Los identificadores 778, 776 y 296 observados en las ejecuciones previas de G13 fueron creados dinámicamente mediante peticiones bajo el middleware de **Sandbox Transaccional** (`X-Test-Run-Id`). Al concluir la suite de Cypress, el hook de teardown ejecutó `DELETE /test-control/runs/{run_id}`, realizando un `ROLLBACK` completo en PostgreSQL. En consecuencia, estos activos biológicos **nunca persistieron** en la base de datos permanente de TEST.

---

## 4. Matriz OBSERVADO vs HIPÓTESIS

| Aspecto | OBSERVADO (Evidencia Verificada) | HIPÓTESIS / INFERENCIA |
| :--- | :--- | :--- |
| **Arquitectura Backend** | No existe `src/modulos`. Todo el código de suministros está bajo `src/supplies/`. | El informe de 1B utilizó una ruta inventada o tomada de un borrador preliminar. |
| **Línea de Enriquecimiento** | `datos_contexto_no_disponibles=False` está en la línea 177 de `consultar_historial_suministros_use_case.py`. | No existe degradación de contexto en el backend en ninguna condición operativa. |
| **Auditoría** | Emite `CONSULTA_HISTORIAL_EJECUTADA` en la misma sesión y conexión SQLAlchemy (`self.db`). | Cada consulta GET exitosa fuera de sandbox queda registrada permanentemente en la auditoría. |
| **Sandbox** | No existe `X-Sandbox-Mode`; se usan `X-Test-Run-Id` y `X-Sandbox-Secret`. | Cualquier prueba que use `X-Sandbox-Mode` será procesada como petición regular sin sandbox. |
| **Literales Frontend** | `HistorialView.tsx:158,184` usa `"Elige un activo"` y `"Sin suministros con esos filtros"`. | Las pruebas E2E de Cypress deben validar estos textos exactos para aserciones de interfaz. |
| **Activos 778, 776, 296** | Los 3 responden HTTP 404 `ACTIVO_NO_ENCONTRADO` en peticiones directas sin sandbox. | Los activos pertenecían a ejecuciones transaccionales con rollback y no existen en la BD de TEST. |

---

## 5. Sección NO DETERMINABLE

1. **Datos de activos biológicos en TEST:** No fue posible listar activos existentes en la base de datos persistente debido a la detención obligatoria por la Puerta 2.2.
2. **Volumen real de suministros:** No es determinable si existe algún activo biológico con datos de suministros ya sembrados en TEST sin la intervención del DBA.
3. **Comportamiento del resumen con datos reales masivos:** Permanece no determinable en TEST en vivo hasta que se ejecute el script `INVENTARIO_SEED_M05.md` en la base de datos.

---

## 6. Registro Completo de Peticiones HTTP Realizadas en Esta Fase

Todas las peticiones fueron dirigidas a `https://api.inmero.co`:

| # | Método | Endpoint / URL Completa (Sin Tokens) | HTTP Status | Hora UTC | Request-ID | Propósito |
| :---: | :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | `GET` | `https://api.inmero.co/api-sgpmp-test/openapi.json` | 200 | 2026-11-07T12:15:06.497Z | `04152045-85ad-4aab-be9e-4753bbcc458b` | Extracción de contrato OpenAPI (1.9) |
| **2** | `POST` | `https://api.inmero.co/api-sgpmp-test/sesiones/` | 400 | 2026-11-07T12:16:49.383Z | `2f108863-5db8-47e1-8fdc-b43e396ff703` | Error de validación de nombres de campo de payload |
| **3** | `POST` | `https://api.inmero.co/api-sgpmp-test/sesiones/` | 200 | 2026-11-07T12:17:19.275Z | `104180b1-bfe5-47ac-9091-f85ff6536a88` | Login exitoso Revisor Fiscal (2.1) |
| **4** | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=778&registros_por_pagina=1` | 404 | 2026-11-07T12:17:19.474Z | `21475378-c742-4a3a-ad21-fac86d760301` | Sondeo activo conocido 778 (2.2) |
| **5** | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=776&registros_por_pagina=1` | 404 | 2026-11-07T12:17:19.608Z | `c7e33330-296e-48ea-82d6-ddfac6226720` | Sondeo activo conocido 776 (2.2) |
| **6** | `GET` | `https://api.inmero.co/api-sgpmp-test/suministros/historial?id_activo_biologico=296&registros_por_pagina=1` | 404 | 2026-11-07T12:17:19.726Z | `fdd6f9ec-9986-4b27-9da0-9e7d10014521` | Sondeo activo conocido 296 (2.2) |

- **Total de peticiones GET realizadas en esta fase:** **4** (Límite estricto: 45).
- **Total de logins API realizados:** **1** exitoso (más 1 rechazo por esquema 400).
- **Peticiones de negocio de escritura:** **0**.

---

## 7. Confirmación de Seguridad y Auditoría

1. **Verificación en el reporte y evidencias:** Se realizó una búsqueda exhaustiva en `fase1c_G41.md` y en todos los archivos `.json` de `testing/test_testing/Modulo5/RF-81/TC-M05-G41/evidencias/diag_g41/`:
   - Ninguna contraseña fue escrita ni persistida.
   - Ningún token JWT de autenticación fue almacenado (el archivo `02_login_revisor_fiscal.json` tiene el valor `"token": "[REDACTED]"`).
   - Ningún secreto de sandbox ni cabecera `Authorization` fue guardado en los archivos ni impreso en el reporte.
2. **Estado de Git:** No se realizó ninguna operación destructiva o de escritura en los repositorios (`0` commits, `0` pushes, `0` checkout, `0` stash, `0` fetch).
3. **Persistencia de evidencias:** Todos los archivos generados en `diag_g41/` (`01_openapi.json` a `05_historial_296.json`) se conservan intactos sin borrado.

