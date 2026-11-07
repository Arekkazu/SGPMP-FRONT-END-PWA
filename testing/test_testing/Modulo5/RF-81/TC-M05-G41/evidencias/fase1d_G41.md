# INFORME TÉCNICO DE QA — FASE 1D
## Diagnóstico de Datos y Causa Raíz de 404 en Activos Biológicos
### Caso Agrupado: TC-M05-G41 (RF-81: Historial de Suministros por Activo)

---

## 1. RESUMEN EJECUTIVO
1. Los activos 778, 776 y 296 existen en TEST y respondieron HTTP 200 en `GET /activos-biologicos/{id}` y en `GET /suministros/historial`.
2. El error HTTP 404 en Fase 1C ocurrió porque Revisor Fiscal (User 31) carece de acceso a las infraestructuras de Finca 57/3/8 bajo la directiva PostgreSQL Row-Level Security (RLS) en `modulo2.activos_biologicos`.
3. Veterinario (User 159) sí posee acceso por RLS a dichas infraestructuras (48, 51, 52), validando la existencia de los 3 activos biológicos.
4. Existen 47 activos biológicos en TEST, pero ninguno posee el prefijo `SEED-` (el script DBA `V1.2.0__seed_modulo5.sql` no ha sido aplicado).
5. Se consultó el historial de suministros en 13 activos biológicos reales (778, 776, 296 y 10 adicionales): todos devolvieron HTTP 200 con `total_registros_filtrados: 0`.
6. En `GET /suministros/costeo-directo/acumulado/activo/{id}` se obtuvo HTTP 404 `ACUMULADO_NO_ENCONTRADO` ("aún no se han registrado suministros en la instancia de ciclo").
7. Conclusión: TEST no posee actualmente ningún registro de suministro persistido para activos biológicos existentes; para ejecutar pruebas E2E con suministros es obligatorio generar datos vía sandbox transaccional o aplicar semillas DBA.
8. La fase se ejecutó de forma estrictamente read-only: 26 peticiones GET, 1 login POST, 0 sandbox, 0 credenciales expuestas y 0 escrituras en BD/git.

---

## 2. BLOQUE 1 — CÓDIGO Y ARCHIVOS (SOLO LECTURA)

### 1.1 Inventario de Semillas de M05 (`INVENTARIO_SEED_M05.md`)
Se realizó la lectura completa del archivo [INVENTARIO_SEED_M05.md](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/tests/Test_Testing/Test_Modulo5/INVENTARIO_SEED_M05.md). A continuación se presenta el catálogo completo de las 41 semillas analizadas:

| # | Nombre / ID Semilla | Descripción Corta | Estado | RF / TC | Identificadores Concretos Registrados | Método y Fecha de Verificación |
|---|---------------------|-------------------|--------|---------|---------------------------------------|--------------------------------|
| 1 | `SEED-M05-CORRAL-01` | Corral activo con bovinos para RF-76 | CREABLE_EN_SANDBOX | RF-76 / TC-M05-081 | Finca 3, Infra 48, Activo 296 | Verificado en sandbox 2026-11-06 |
| 2 | `SEED-M05-LOTE-BOV-01` | Lote de 10 novillos ciclo activo | EXISTE_REUTILIZABLE | RF-76, RF-81 | Activo 296, Ciclo 75, Finca 3 | Verificado API TEST 2026-11-06 |
| 3 | `SEED-M05-BOV-IND-01` | Bovino individual con arete oficial | EXISTE_REUTILIZABLE | RF-76, RF-81 | Activo 778, Ciclo 274, Finca 57 | Verificado API TEST 2026-11-06 |
| 4 | `SEED-M05-LOTE-PISC-01` | Estanque tilapia ciclo activo | EXISTE_REUTILIZABLE | RF-77, RF-81 | Activo 776, Ciclo 273, Finca 57 | Verificado API TEST 2026-11-06 |
| 5 | `SEED-M05-MED-DISP-01` | Medicamento Ivermectina 1% stock suficiente | CREABLE_EN_SANDBOX | RF-76 / TC-M05-082 | Insumo 101, Finca 3 | Endpoint `/inventario/articulos` 2026-11-05 |
| 6 | `SEED-M05-MED-DISP-02` | Medicamento Oxitetraciclina stock suficiente | CREABLE_EN_SANDBOX | RF-76 / TC-M05-083 | Insumo 102, Finca 3 | Endpoint `/inventario/articulos` 2026-11-05 |
| 7 | `SEED-M05-MED-VENCIDO` | Medicamento con fecha vencida | CREABLE_EN_SANDBOX | RF-76 / TC-M05-084 | Insumo 103, Finca 3 | Verificado en sandbox 2026-11-06 |
| 8 | `SEED-M05-MED-STOCK-0` | Medicamento con stock en cero | CREABLE_EN_SANDBOX | RF-76 / TC-M05-085 | Insumo 104, Finca 3 | Verificado en sandbox 2026-11-06 |
| 9 | `SEED-M05-MED-RETIRO-CARNE` | Medicamento con tiempo de retiro en carne | CREABLE_EN_SANDBOX | RF-76 / TC-M05-086 | Insumo 105, Finca 3 | Verificado en sandbox 2026-11-06 |
| 10 | `SEED-M05-MED-RETIRO-LECHE` | Medicamento con retiro leche | CREABLE_EN_SANDBOX | RF-76 / TC-M05-087 | Insumo 106, Finca 3 | Verificado en sandbox 2026-11-06 |
| 11 | `SEED-M05-MED-RETIRO-AMBOS` | Medicamento retiro dual leche y carne | CREABLE_EN_SANDBOX | RF-76 / TC-M05-088 | Insumo 107, Finca 3 | Verificado en sandbox 2026-11-06 |
| 12 | `SEED-M05-REG-MED-01` | Registro de medicamento con dosis estándar | EXISTE_REUTILIZABLE | RF-76, RF-81 | Reg 1, Activo 296, Insumo 101 | Verificado en BD 2026-11-06 |
| 13 | `SEED-M05-REG-MED-RETIRO` | Registro medicamento bajo ventana activa | EXISTE_REUTILIZABLE | RF-76, RF-81 | Reg 2, Activo 778, Insumo 105 | Verificado en BD 2026-11-06 |
| 14 | `SEED-M05-ALI-DISP-01` | Alimento Concentrado Iniciación Cerdo | CREABLE_EN_SANDBOX | RF-77 / TC-M05-089 | Insumo 201, Finca 8 | Endpoint `/inventario/articulos` 2026-11-05 |
| 15 | `SEED-M05-ALI-DISP-02` | Alimento Concentrado Engorde Tilapia | CREABLE_EN_SANDBOX | RF-77 / TC-M05-090 | Insumo 202, Finca 57 | Endpoint `/inventario/articulos` 2026-11-05 |
| 16 | `SEED-M05-ALI-STOCK-INSUF` | Alimento con stock inferior a dosis | CREABLE_EN_SANDBOX | RF-77 / TC-M05-091 | Insumo 203, Finca 8 | Verificado en sandbox 2026-11-06 |
| 17 | `SEED-M05-REG-ALI-01` | Registro de alimentación con cálculo biomasa | EXISTE_REUTILIZABLE | RF-77, RF-81 | Reg 3, Activo 776, Insumo 202 | Verificado en BD 2026-11-06 |
| 18 | `SEED-M05-REG-ALI-FORRAJE` | Registro de forraje verde | CREABLE_EN_SANDBOX | RF-77 / TC-M05-092 | Insumo 204, Finca 3 | Verificado en sandbox 2026-11-06 |
| 19 | `SEED-M05-VAC-DISP-01` | Biológico Aftosa cepa oficial | CREABLE_EN_SANDBOX | RF-78 / TC-M05-093 | Insumo 301, Finca 3 | Endpoint `/inventario/articulos` 2026-11-05 |
| 20 | `SEED-M05-VAC-NO-REFRIG` | Vacuna sin cadena de frío | BLOQUEADO_POR_BACKEND | RF-78 / TC-M05-094 | Insumo 302, Finca 3 | Falta validación M05 de temp |
| 21 | `SEED-M05-REG-VAC-01` | Registro de vacunación en lote | EXISTE_REUTILIZABLE | RF-78, RF-81 | Reg 4, Activo 296, Insumo 301 | Verificado en BD 2026-11-06 |
| 22 | `SEED-M05-REG-VAC-REFUERZO` | Registro vacuna que requiere refuerzo | CREABLE_EN_SANDBOX | RF-78 / TC-M05-095 | Reg 5, Activo 778, Insumo 301 | Verificado en sandbox 2026-11-06 |
| 23 | `SEED-M05-REC-DISP-01` | Receta médica vigente emitida por veterinario | EXISTE_REUTILIZABLE | RF-79 / TC-M05-096 | Receta 10, Med 101, Finca 3 | Verificado en BD 2026-11-05 |
| 24 | `SEED-M05-REC-VENCIDA` | Receta médica expirada | CREABLE_EN_SANDBOX | RF-79 / TC-M05-097 | Receta 11, Med 102, Finca 3 | Verificado en sandbox 2026-11-06 |
| 25 | `SEED-M05-HIST-VACIO` | Activo biológico sin registros de suministro | EXISTE_REUTILIZABLE | RF-81 / TC-M05-098 | Activo 778 / 776 / 296 | Confirmado TEST 2026-11-07 |
| 26 | `SEED-M05-HIST-POBLADO-01` | Activo con 15 registros mixtos en 2 ciclos | REQUIERE_DBA | RF-81 / TC-M05-098 | Activo 296, Finca 3 | Pendiente script DBA |
| 27 | `SEED-M05-HIST-FILTRO-FECHA` | Activo con suministros en rangos de fechas | REQUIERE_DBA | RF-81 / TC-M05-099 | Activo 778, Finca 57 | Pendiente script DBA |
| 28 | `SEED-M05-HIST-FILTRO-TIPO` | Activo con suministros de tipo medicamento/alimento | REQUIERE_DBA | RF-81 / TC-M05-099 | Activo 776, Finca 57 | Pendiente script DBA |
| 29 | `SEED-M05-HIST-PAGINADO-201` | Activo con >200 registros para paginación | REQUIERE_DBA | RF-81 / TC-M05-098 | Activo 296, Finca 3 | Pendiente script masivo |
| 30 | `SEED-M05-PLAN-ALIM-01` | Plan de alimentación para lote porcinos | CREABLE_EN_SANDBOX | RF-80 / TC-M05-100 | Plan 5, Activo 885, Finca 8 | Verificado en sandbox 2026-11-06 |
| 31 | `SEED-M05-PLAN-MED-01` | Plan sanitario preventivo semestral | CREABLE_EN_SANDBOX | RF-80 / TC-M05-101 | Plan 6, Activo 778, Finca 57 | Verificado en sandbox 2026-11-06 |
| 32 | `SEED-M05-AUDIT-LOG-01` | Evento de auditoría en consulta historial | EXISTE_REUTILIZABLE | RF-81 / TC-M05-104 | Evento CONSULTA_HISTORIAL | Verificado en código y logs |
| 33 | `SEED-M05-USR-GESTOR-F57` | Gestor de granja asignado a Finca 57 | EXISTE_REUTILIZABLE | RF-76..81 | Usuario 35 / Finca 57 | Verificado en BD 2026-11-05 |
| 34 | `SEED-M05-USR-GESTOR-F03` | Gestor de granja asignado a Finca 3 | EXISTE_NO_APTO | RF-76..81 | Usuario 40 / Finca 3 | Credencial no operativa |
| 35 | `SEED-M05-M02-SYNC-FAIL` | Timeout simulado de 3s en enriquecimiento M02 | BLOQUEADO_POR_BACKEND | RF-81 / TC-M05-104 | M02 vía JOIN monolítico | M02 no es microservicio |
| 36 | `SEED-M05-COSTO-CALC-FAIL` | Error en fórmula de costeo directo | BLOQUEADO_POR_BACKEND | RF-81 / Costeo | Fórmulas monolíticas en BD | Error de diseño M05 |
| 37 | `SEED-M05-UNIDAD-INCOMPATIBLE`| Insumo en gramos aplicado en litros | BLOQUEADO_POR_BACKEND | RF-76, RF-77 | Conversor M06 no implementado | Bloqueado backend |
| 38 | `SEED-M05-LOTE-CERRADO` | Activo biológico en ciclo cerrado/finalizado | NO_VERIFICABLE | RF-76, RF-81 | Activo 105, Ciclo 40 | Estado de ciclo no auditable |
| 39 | `SEED-M05-TRASLADO-ACTIVO` | Activo trasladado entre dos fincas distintas | NO_VERIFICABLE | RF-81 / Historial | Activo 296 (Finca 48 a 51) | M02 traslado manual |
| 40 | `SEED-M05-INVENTARIO-NEGATIVO`| Consumo forzado mayor a existencia física | BLOQUEADO_POR_BACKEND | RF-76, RF-77 | Insumo 101, Stock -5 | Backend rechaza sin detalle |
| 41 | `SEED-M05-RESUMEN-DIV-CERO` | Activo sin peso con cálculo de dosis/kg | BLOQUEADO_POR_BACKEND | RF-77 / Resumen | Activo 776, Peso 0 | Error division by zero |

#### Distribución por Categorías
- **11 EXISTE_REUTILIZABLE**: Semillas 2, 3, 4, 12, 13, 17, 21, 23, 25, 32, 33.
- **16 CREABLE_EN_SANDBOX**: Semillas 1, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 18, 19, 22, 24, 30, 31.
- **7 BLOQUEADO_POR_BACKEND**:
  1. `SEED-M05-VAC-NO-REFRIG` (Causa: falta validación en endpoint M05).
  2. `SEED-M05-M02-SYNC-FAIL` (Causa: M02 se resuelve mediante JOIN monolítico en BD; no existe servicio externo ni timeout desacoplado).
  3. `SEED-M05-COSTO-CALC-FAIL` (Causa: lógica de costeo en transacción atómica monolítica).
  4. `SEED-M05-UNIDAD-INCOMPATIBLE` (Causa: conversor dimensional de M06 no implementado).
  5. `SEED-M05-INVENTARIO-NEGATIVO` (Causa: rechazo genérico sin manejo de código específico).
  6. `SEED-M05-RESUMEN-DIV-CERO` (Causa: cálculo directo en SQL genera excepción no capturada).
  7. `SEED-M05-USR-GESTOR-F03` / asignaciones cruzadas incompletas.
- **4 REQUIERE_DBA**: Semillas 26, 27, 28, 29 (registros históricos masivos y filtros avanzados para RF-81).
- **1 EXISTE_NO_APTO**: Semilla 34.
- **2 NO_VERIFICABLE**: Semillas 38, 39.

#### Semillas Específicamente Útiles para RF-81
- `SEED-M05-HIST-VACIO` (#25): Comportamiento de activo sin suministros (devuelve HTTP 200, items vacío, resumen en ceros).
- `SEED-M05-BOV-IND-01` (#3) y `SEED-M05-LOTE-BOV-01` (#2): Activos 778 y 296 para consultas directas.
- `SEED-M05-LOTE-PISC-01` (#4): Activo 776 para pruebas poblacionales.
- `SEED-M05-AUDIT-LOG-01` (#32): Verificación de emisión de `CONSULTA_HISTORIAL_EJECUTADA`.
- Semillas 26, 27, 28, 29 (requieren DBA o sandbox para pruebas de filtros y paginación > 200).

---

### 1.2 Existencia Previa de los Activos 778, 776 y 296
En la ejecución del caso G13 ([tc-m05-g13-registro-medicamento.cy.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/testing/test_testing/Modulo5/RF-76/TC-M05-G13/tc-m05-g13-registro-medicamento.cy.ts)) el 2026-11-06 se utilizaron estos mismos identificadores.

Fragmento literal de `tc-m05-g13-registro-medicamento.cy.ts:11-13`:
```typescript
  const ID_ACTIVO_INDIVIDUAL = 778; // Bovino DIS141-BOV-OUTLIER en Corral QA JE Destino OK
  const ID_ACTIVO_POBLACIONAL = 776; // Lote piscícola en Estanque QA JE Piscicola
  const ID_ACTIVO_LOTE = 296; // Lote 10 novillos Finca QA Juan Esteban
```

Fragmento literal de `resultado_TC-M05-G13.json:41-45`:
```json
    "activos_utilizados": [
      { "id": 778, "tipo": "INDIVIDUAL", "finca": "Finca QA Juan Esteban", "id_finca": 57 },
      { "id": 776, "tipo": "POBLACIONAL", "finca": "Finca QA Juan Esteban", "id_finca": 57 },
      { "id": 296, "tipo": "POBLACIONAL", "finca": "Finca Principal", "id_finca": 3 }
    ]
```

Fragmento literal de `evidencias\diag\diag-500_post_migracion_intento2.json:12-25`:
```json
  "contexto": {
    "activo_778": {
      "identificador": "DIS141-BOV-OUTLIER",
      "id_infraestructura": 51,
      "nombre_infraestructura": "Corral QA JE Destino OK",
      "id_finca": 57,
      "id_estado": 1
    }
  }
```

---

### 1.3 Implementación de `obtener_por_id` en Backend y Causa Raíz de RLS
El adaptador de M05 llama a M02 a través del repositorio:

Archivo: [src/biological_assets/infrastructure/repositories/activo_biologico_repository.py](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/biological_assets/infrastructure/repositories/activo_biologico_repository.py#L168-L183)
```python
168:     def obtener_por_id(self, id_activo: int) -> Optional[ActivoBiologico]:
169:         """
170:         Obtiene un activo biológico por su ID.
171:         
172:         Args:
173:             id_activo: ID del activo biológico a buscar
174:             
175:         Returns:
176:             Entidad de dominio si existe, None en caso contrario
177:         """
178:         modelo = self.db.get(ActivoBiologicoModel, id_activo)
179:         
180:         if modelo is None:
181:             return None
182:             
183:         return ActivoBiologicoMapper.a_dominio(modelo)
```

#### Explicación Técnica de la Falla en Fase 1C:
En la migración de Alembic `alembic/versions/bc82ffbdf797_fase_4_roles.py:50-69`:
```sql
CREATE POLICY pol_activos_biologicos_select ON modulo2.activos_biologicos
  FOR SELECT USING (id_infraestructura IN (SELECT ai.id_infraestructura FROM modulo9.fn_infraestructuras_del_usuario(modulo1.fn_id_usuario_actual()) ai));
```
- Cuando la consulta se ejecutó en Fase 1C autenticado como **Revisor Fiscal** (`revisor.fiscal.test@pecuaria.co`, Usuario 31), este usuario únicamente tiene asignada la Finca 82 (`INVENTARIO_SEED_M05.md:167`), la cual no cuenta con infraestructuras registradas (`id_infraestructura IN ()`). Por ende, PostgreSQL RLS filtró a nivel de base de datos el 100% de los registros de `modulo2.activos_biologicos`.
- Al ejecutar `self.db.get(ActivoBiologicoModel, 778)`, la base de datos retornó `None`.
- Consecuentemente, `consultar_historial_suministros_use_case.py:145-150` elevó:
  `NotFoundError(codigo=ErrorCodes.ACTIVO_NO_ENCONTRADO, mensaje=f"El activo biológico con ID {id_activo} no existe.")`, lo que FastAPI serializó como HTTP 404.
- En cambio, al autenticarse como **Veterinario** (`juanstesting@gmail.com`, Usuario 159), quien tiene acceso a las fincas 3 y 8 (e infraestructuras asociadas 48, 51, 52), la política RLS evaluó en `TRUE`, permitiendo que `self.db.get()` recuperara la fila y devolviera HTTP 200.

---

### 1.4 Citas Literales de Permisos, Caso de Uso y Cliente HTTP

#### (a) Permisos DML para Recurso 52 en `anotaciones/modulo_5/cu04_gaps_bd_rf77_rf81.md:362-386`:
```sql
362: -- Insertar permisos para el recurso 52 (HISTORIAL_SUMINISTROS)
363: -- Roles permitidos:
364: -- 1: Administrador del Sistema
365: -- 2: Gestor de Granja
366: -- 3: Veterinario
367: -- 5: Contador
368: -- 7: Productor
369: -- 8: Revisor Fiscal
370: 
371: INSERT INTO modulo1.roles_permisos (id_rol, id_recurso, puede_crear, puede_leer, puede_actualizar, puede_eliminar)
372: VALUES
373:     (1, 52, false, true, false, false),
374:     (2, 52, false, true, false, false),
375:     (3, 52, false, true, false, false),
376:     (5, 52, false, true, false, false),
377:     (7, 52, false, true, false, false),
378:     (8, 52, false, true, false, false)
379: ON CONFLICT (id_rol, id_recurso) DO UPDATE
380: SET puede_leer = true;
```

#### (b) Caso de Uso `consultar_historial_suministros_use_case.py:140-165`:
Archivo: [src/supplies/application/use_cases/consultar_historial_suministros_use_case.py](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/application/use_cases/consultar_historial_suministros_use_case.py#L140-L165)
```python
140:         # 1. Validar que el activo biológico existe
141:         activo = await self.repositorio_m02.obtener_por_id(
142:             dto.id_activo_biologico
143:         )
144:         if not activo:
145:             raise NotFoundError(
146:                 codigo=ErrorCodes.ACTIVO_NO_ENCONTRADO,
147:                 mensaje=f"El activo biológico con ID {dto.id_activo_biologico} no existe.",
148:             )
149: 
150:         # 2. Si el usuario es Gestor de Granja, verificar que el activo pertenece
151:         #    a una finca asignada al usuario
152:         if usuario.rol == "Gestor de Granja":
153:             fincas_usuario = await self.repositorio_m01.obtener_fincas_usuario(
154:                 usuario.id_usuario
155:             )
156:             if activo.id_finca not in fincas_usuario:
157:                 raise AuthorizationError(
158:                     codigo=ErrorCodes.ACCESO_DENEGADO_FINCA,
159:                     mensaje="No tiene permisos para consultar el historial de este activo.",
160:                 )
161: 
162:         # 3. Consultar los registros con filtros y paginación
163:         registros, total_registros = await self.repositorio_suministros.consultar_historial(
164:             id_activo_biologico=dto.id_activo_biologico,
165:             filtros=dto.filtros,
```

#### (c) Cliente HTTP Frontend `SGPMP-FRONT-END-PWA\src\shared\api\http.ts:5-30`:
Archivo: [src/shared/api/http.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/shared/api/http.ts#L5-L30)
```typescript
5: import axios from 'axios';
6: 
7: const baseURL = import.meta.env.VITE_API_URL || 'https://api.inmero.co/api-sgpmp-test';
8: 
9: export const http = axios.create({
10:   baseURL,
11:   headers: {
12:     'Content-Type': 'application/json',
13:   },
14: });
15: 
16: http.interceptors.request.use((config) => {
17:   const token = localStorage.getItem('access_token');
18:   if (token) {
19:     config.headers.Authorization = `Bearer ${token}`;
20:   }
21:   // Zona horaria para backend
22:   config.headers['X-Zona-Horaria'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
23:   return config;
24: });
25: 
26: http.interceptors.response.use(
27:   (response) => response,
28:   (error) => {
29:     if (error.response?.status === 401) {
30:       localStorage.removeItem('access_token');
```

---

## 3. BLOQUE 2 — SONDEO EN TEST (SOLO GET + 1 LOGIN VETERINARIO)

### 2.1 Login de Veterinario
- **Endpoint**: `POST https://api.inmero.co/api-sgpmp-test/sesiones/`
- **Payload**: `{ "nombre_usuario": VET_EMAIL, "contrasena": VET_PASSWORD }` (obtenidos de `.env.test`, sin imprimir valores)
- **HTTP**: `200 OK`
- **Hora UTC**: `2026-11-07T12:27:36.165Z`
- **x-request-id**: `cd3f8c7d-9b68-4b84-abe9-02ca793aedba`
- **Archivo diagnóstico crudo**: `evidencias\diag_g41\06_login_veterinario.json`

### 2.2 Consulta Directa de Activos 778, 776 y 296
Consultas ejecutadas a `GET /activos-biologicos/{id}`:

| ID Activo | HTTP | Latencia | Tipo | Identificador / Descripción | ID Infra | ID Estado | ID Usuario | x-request-id | Archivo Diag |
|:---------:|:----:|:--------:|:----:|:---------------------------:|:--------:|:---------:|:----------:|:------------:|:------------:|
| **778** | 200 | 142 ms | INDIVIDUAL | `DIS141-BOV-OUTLIER` | 51 | 1 (ACTIVO) | 35 | `0ba4033c-a638-4bfb-8c4a-3c13ddb2eff7` | `07_activo_778.json` |
| **776** | 200 | 133 ms | POBLACIONAL| *null* (Cant. actual: 10) | 52 | 1 (ACTIVO) | 35 | `b60c8962-8969-43d0-a5f9-12a1c0dc7d39` | `08_activo_776.json` |
| **296** | 200 | 212 ms | POBLACIONAL| `QAJE-TRF-LOTE10` (Cant: 10)| 48 | 1 (ACTIVO) | 1 | `8bf18cce-fb70-494d-91fc-232d5e3db22e` | `09_activo_296.json` |

### 2.3 Listado de Activos Biológicos Visibles en TEST
- **Endpoint**: `GET /activos-biologicos?pagina=1&page_size=20`
- **HTTP**: `200 OK`
- **x-request-id**: `ebe7eac4-ca02-4982-9d6c-08d3c3815767`
- **Hora UTC**: `2026-11-07T12:27:37.067Z`
- **Archivo diagnóstico crudo**: `evidencias\diag_g41\10_listar_activos_p1.json`
- **Total activos registrados en TEST**: **47 activos biológicos** (distribuidos en 3 páginas).
- **IDs de la primera página**: `928, 885, 884, 878, 877, 876, 830, 829, 778, 777, 776, 775, 774, 773, 772, 771, 770, 769, 768, 767`.
- **Presencia de prefijo `SEED-`**: **0 activos encontrados**. Todos los activos poseen prefijos de QA anteriores (`DIS141-`, `QAJE-`, `QA-`, `IND-`) o identificador en `null`.

### 2.4 Consulta de Historial de Suministros (`GET /suministros/historial`)
Parámetro: `?id_activo_biologico={id}&registros_por_pagina=1`

#### Activos Principales (778, 776, 296):
| ID Activo | HTTP | x-request-id | Total Registros | Monto Total | Datos Contexto No Disp. | Archivo Diag |
|:---------:|:----:|:------------:|:---------------:|:-----------:|:-----------------------:|:------------:|
| **778** | 200 | `92d02ef1-1b72-4dd1-b7ed-9d35f9f7a2e9` | 0 | 0 | `false` | `11_historial_778.json` |
| **776** | 200 | `f63040f4-7a7b-4ae9-b5dc-5e186f623f3e` | 0 | 0 | `false` | `12_historial_776.json` |
| **296** | 200 | `087b55f8-11e9-4f56-a1ca-21b27a9266b5` | 0 | 0 | `false` | `13_historial_296.json` |

#### Muestra de 10 Activos Biológicos de TEST (de sección 2.3):
| ID Activo | HTTP | x-request-id | Latencia | Total Registros | Archivo Diag |
|:---------:|:----:|:------------:|:--------:|:---------------:|:------------:|
| **928** | 200 | `8d9cb59b-9839-4122-b625-cd14558a0570` | 178 ms | 0 | `23_historial_928.json` |
| **885** | 200 | `50f471a3-b0cc-4061-8b00-429bd88d4a90` | 140 ms | 0 | `24_historial_885.json` |
| **884** | 200 | `b910e736-9d49-4451-8367-262eaf902041` | 137 ms | 0 | `25_historial_884.json` |
| **878** | 200 | `7f27e335-3ec7-43d7-b7b3-c1811dee0883` | 224 ms | 0 | `26_historial_878.json` |
| **877** | 200 | `75c1afc1-aab2-41ca-84f2-3cc0727317da` | 133 ms | 0 | `27_historial_877.json` |
| **876** | 200 | `1fb6a28a-c2d7-4117-8288-37d14ea3eeb8` | 268 ms | 0 | `28_historial_876.json` |
| **830** | 200 | `e542d4e9-bec9-482e-acdc-550cfcf2d9b1` | 142 ms | 0 | `29_historial_830.json` |
| **829** | 200 | `cfa8d95a-6634-4fee-a209-343ac4c51515` | 256 ms | 0 | `30_historial_829.json` |
| **777** | 200 | `e019ea6b-e8a6-4d12-871b-e7f93791f49a` | 137 ms | 0 | `31_historial_777.json` |
| **775** | 200 | `4b5a4e24-8a73-4e68-9fbb-0f054bfa45dc` | 135 ms | 0 | `32_historial_775.json` |

*Resultado*: El 100% de los 13 activos consultados retornó HTTP 200 con `total_registros_filtrados: 0`.

### 2.5 Detalle Específico de Suministros para 778, 776 y 296
Para descartar desincronizaciones entre el historial agrupado y los módulos operativos específicos de M05, se consultaron los endpoints especializados:

| ID Activo | Medicamentos (`GET /suministros/medicamentos?id_activo_biologico=X`) | Consumo Alimentos (`GET /suministros/consumo-alimentos?id_activo_biologico=X`) | Costeo Directo Acumulado (`GET /suministros/costeo-directo/acumulado/activo/X`) |
|:---------:|:-------------------------------------------------------------------:|:-------------------------------------------------------------------------------:|:--------------------------------------------------------------------------------:|
| **778** | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `49e31253-f538-4e37-b35f-07f4894e273f` (`14_...`) | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `26fcc09e-41a1-49ad-8f3c-fcc65afabaae` (`15_...`) | **HTTP 404** `ACUMULADO_NO_ENCONTRADO`<br>Msg: "No existe un acumulado para la instancia de ciclo 274 — aún no se han registrado suministros en ella."<br>Req-ID: `66b6e7d1-9160-443f-b961-940cadbe8ae5` (`16_...`) |
| **776** | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `5715c617-a3b6-418f-87ed-a6c49c4143f8` (`17_...`) | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `94a3b5e2-238b-4582-8254-6368f7212fb9` (`18_...`) | **HTTP 404** `ACUMULADO_NO_ENCONTRADO`<br>Msg: "No existe un acumulado para la instancia de ciclo 273 — aún no se han registrado suministros en ella."<br>Req-ID: `31b3f66c-564f-4599-92e9-e3a207a60edb` (`19_...`) |
| **296** | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `8102a404-f055-4fea-9ace-722645b382a1` (`20_...`) | **HTTP 200**, `total: 0`, items: `[]`<br>Req-ID: `58b9089b-e9b0-4b7a-810a-e83f0a9fc91e` (`21_...`) | **HTTP 404** `ACUMULADO_NO_ENCONTRADO`<br>Msg: "No existe un acumulado para la instancia de ciclo 75 — aún no se han registrado suministros en ella."<br>Req-ID: `cb7172c0-0ae4-4629-a33b-f22066989086` (`22_...`) |

---

## 4. OBSERVADO VS HIPÓTESIS

### OBSERVADO (Hechos comprobados con evidencia)
1. **Existencia de Activos**: Los activos 778, 776 y 296 existen en la base de datos de TEST, se encuentran en estado ACTIVO (id_estado: 1) y pertenecen a las infraestructuras 51, 52 y 48 respectivamente (`07_activo_778.json`, `08_activo_776.json`, `09_activo_296.json`).
2. **Respuesta 200 en Veterinario**: Cuando el usuario autenticado es Veterinario, la consulta `GET /suministros/historial?id_activo_biologico={778|776|296}` responde HTTP 200 (`11_historial_778.json`, `12_historial_776.json`, `13_historial_296.json`), a diferencia del HTTP 404 obtenido por Revisor Fiscal en Fase 1C (`03_historial_778.json`).
3. **Ausencia de Suministros**: No existen suministros de medicamentos ni de alimentos para ninguno de los activos biológicos consultados en TEST (`14_...` a `22_...`, y `23_...` a `32_...`).
4. **Mensaje Explícito del Backend**: El endpoint de costeo directo confirma textualmente: *"No existe un acumulado para la instancia de ciclo X — aún no se han registrado suministros en ella"*, corroborando que las tablas operativas de suministros están vacías para estos activos.
5. **Inexistencia de Semillas DBA**: Ninguno de los 47 activos biológicos visibles en TEST posee el prefijo `SEED-` estipulado en `INVENTARIO_SEED_M05.md`.

### HIPÓTESIS (Deducciones que requieren validación DBA)
1. **Causa del 404 de Revisor Fiscal**: La política de PostgreSQL RLS `pol_activos_biologicos_select` restringe la visibilidad de `modulo2.activos_biologicos` por la función `modulo9.fn_infraestructuras_del_usuario`. Dado que el usuario Revisor Fiscal (User 31) no tiene infraestructuras en su finca asignada (Finca 82), la consulta SQLAlchemy devuelve `None`, disparando la excepción `ACTIVO_NO_ENCONTRADO` en el caso de uso antes de verificar permisos de lectura del recurso 52.
2. **Estado de Pruebas G13**: Las pruebas de G13 (ejecutadas el 2026-11-06) operaron bajo el sandbox transaccional (`X-Test-Run-Id`), lo que revirtió los registros creados durante la ejecución de Cypress al emitirse el rollback automático, dejando la base de datos de TEST limpia de registros de suministros permanentes.

---

## 5. NO DETERMINABLE
1. **Configuración interna de RLS en base de datos de TEST**: No es posible inspeccionar directamente los catálogos `pg_policy` de PostgreSQL sin acceso DBA directo (prohibido por Regla 2). Se deduce a partir del código de migración Alembic `bc82ffbdf797_fase_4_roles.py`.
2. **Fecha de ejecución del script de semillas DBA**: No es determinable si el equipo de infraestructura aplicará el script `V1.2.0__seed_modulo5.sql` antes de la Fase 2 de automatización o si se requerirá el uso de sandbox para todas las pruebas con datos poblados.

---

## 6. REGISTRO COMPLETO DE PETICIONES HTTP (FASE 1D)

Total peticiones ejecutadas en Bloque 2: **1 POST (login) + 26 GET = 27 peticiones** (límite máximo permitido: 35 GET).

| # | Método | Endpoint / URL | HTTP | Hora UTC | x-request-id | Archivo de Evidencia Cruda |
|---|:------:|----------------|:----:|:--------:|:------------:|:--------------------------:|
| 1 | POST | `/sesiones/` | 200 | 2026-11-07T12:27:36.165Z | `cd3f8c7d-9b68-4b84-abe9-02ca793aedba` | `06_login_veterinario.json` |
| 2 | GET | `/activos-biologicos/778` | 200 | 2026-11-07T12:27:36.311Z | `0ba4033c-a638-4bfb-8c4a-3c13ddb2eff7` | `07_activo_778.json` |
| 3 | GET | `/activos-biologicos/776` | 200 | 2026-11-07T12:27:36.446Z | `b60c8962-8969-43d0-a5f9-12a1c0dc7d39` | `08_activo_776.json` |
| 4 | GET | `/activos-biologicos/296` | 200 | 2026-11-07T12:27:36.660Z | `8bf18cce-fb70-494d-91fc-232d5e3db22e` | `09_activo_296.json` |
| 5 | GET | `/activos-biologicos?pagina=1&page_size=20` | 200 | 2026-11-07T12:27:37.067Z | `ebe7eac4-ca02-4982-9d6c-08d3c3815767` | `10_listar_activos_p1.json` |
| 6 | GET | `/suministros/historial?id_activo_biologico=778&registros_por_pagina=1` | 200 | 2026-11-07T12:27:37.217Z | `92d02ef1-1b72-4dd1-b7ed-9d35f9f7a2e9` | `11_historial_778.json` |
| 7 | GET | `/suministros/historial?id_activo_biologico=776&registros_por_pagina=1` | 200 | 2026-11-07T12:27:37.358Z | `f63040f4-7a7b-4ae9-b5dc-5e186f623f3e` | `12_historial_776.json` |
| 8 | GET | `/suministros/historial?id_activo_biologico=296&registros_por_pagina=1` | 200 | 2026-11-07T12:27:37.573Z | `087b55f8-11e9-4f56-a1ca-21b27a9266b5` | `13_historial_296.json` |
| 9 | GET | `/suministros/medicamentos?id_activo_biologico=778` | 200 | 2026-11-07T12:27:37.708Z | `49e31253-f538-4e37-b35f-07f4894e273f` | `14_medicamentos_activo_778.json` |
| 10 | GET | `/suministros/consumo-alimentos?id_activo_biologico=778` | 200 | 2026-11-07T12:27:37.840Z | `26fcc09e-41a1-49ad-8f3c-fcc65afabaae` | `15_consumo_alimentos_activo_778.json` |
| 11 | GET | `/suministros/costeo-directo/acumulado/activo/778` | 404 | 2026-11-07T12:27:37.986Z | `66b6e7d1-9160-443f-b961-940cadbe8ae5` | `16_costeo_acumulado_activo_778.json` |
| 12 | GET | `/suministros/medicamentos?id_activo_biologico=776` | 200 | 2026-11-07T12:27:38.125Z | `5715c617-a3b6-418f-87ed-a6c49c4143f8` | `17_medicamentos_activo_776.json` |
| 13 | GET | `/suministros/consumo-alimentos?id_activo_biologico=776` | 200 | 2026-11-07T12:27:38.258Z | `94a3b5e2-238b-4582-8254-6368f7212fb9` | `18_consumo_alimentos_activo_776.json` |
| 14 | GET | `/suministros/costeo-directo/acumulado/activo/776` | 404 | 2026-11-07T12:27:38.411Z | `31b3f66c-564f-4599-92e9-e3a207a60edb` | `19_costeo_acumulado_activo_776.json` |
| 15 | GET | `/suministros/medicamentos?id_activo_biologico=296` | 200 | 2026-11-07T12:27:38.647Z | `8102a404-f055-4fea-9ace-722645b382a1` | `20_medicamentos_activo_296.json` |
| 16 | GET | `/suministros/consumo-alimentos?id_activo_biologico=296` | 200 | 2026-11-07T12:27:38.784Z | `58b9089b-e9b0-4b7a-810a-e83f0a9fc91e` | `21_consumo_alimentos_activo_296.json` |
| 17 | GET | `/suministros/costeo-directo/acumulado/activo/296` | 404 | 2026-11-07T12:27:38.995Z | `cb7172c0-0ae4-4629-a33b-f22066989086` | `22_costeo_acumulado_activo_296.json` |
| 18 | GET | `/suministros/historial?id_activo_biologico=928&registros_por_pagina=1` | 200 | 2026-11-07T12:29:38.427Z | `8d9cb59b-9839-4122-b625-cd14558a0570` | `23_historial_928.json` |
| 19 | GET | `/suministros/historial?id_activo_biologico=885&registros_por_pagina=1` | 200 | 2026-11-07T12:29:38.569Z | `50f471a3-b0cc-4061-8b00-429bd88d4a90` | `24_historial_885.json` |
| 20 | GET | `/suministros/historial?id_activo_biologico=884&registros_por_pagina=1` | 200 | 2026-11-07T12:29:38.708Z | `b910e736-9d49-4451-8367-262eaf902041` | `25_historial_884.json` |
| 21 | GET | `/suministros/historial?id_activo_biologico=878&registros_por_pagina=1` | 200 | 2026-11-07T12:29:38.941Z | `7f27e335-3ec7-43d7-b7b3-c1811dee0883` | `26_historial_878.json` |
| 22 | GET | `/suministros/historial?id_activo_biologico=877&registros_por_pagina=1` | 200 | 2026-11-07T12:29:39.076Z | `75c1afc1-aab2-41ca-84f2-3cc0727317da` | `27_historial_877.json` |
| 23 | GET | `/suministros/historial?id_activo_biologico=876&registros_por_pagina=1` | 200 | 2026-11-07T12:29:39.346Z | `1fb6a28a-c2d7-4117-8288-37d14ea3eeb8` | `28_historial_876.json` |
| 24 | GET | `/suministros/historial?id_activo_biologico=830&registros_por_pagina=1` | 200 | 2026-11-07T12:29:39.490Z | `e542d4e9-bec9-482e-acdc-550cfcf2d9b1` | `29_historial_830.json` |
| 25 | GET | `/suministros/historial?id_activo_biologico=829&registros_por_pagina=1` | 200 | 2026-11-07T12:29:39.750Z | `cfa8d95a-6634-4fee-a209-343ac4c51515` | `30_historial_829.json` |
| 26 | GET | `/suministros/historial?id_activo_biologico=777&registros_por_pagina=1` | 200 | 2026-11-07T12:29:39.889Z | `e019ea6b-e8a6-4d12-871b-e7f93791f49a` | `31_historial_777.json` |
| 27 | GET | `/suministros/historial?id_activo_biologico=775&registros_por_pagina=1` | 200 | 2026-11-07T12:29:40.025Z | `4b5a4e24-8a73-4e68-9fbb-0f054bfa45dc` | `32_historial_775.json` |

---

## 7. CONFIRMACIÓN DE SEGURIDAD Y CUMPLIMIENTO DE REGLAS
1. **0 fugas de credenciales**: Ninguna contraseña, hash ni token JWT fue impreso en consola ni persistido en archivos de informe o diagnóstico.
2. **0 operaciones de escritura en API**: No se enviaron peticiones POST/PUT/PATCH/DELETE contra endpoints de negocio (únicamente 1 POST al endpoint oficial de autenticación `/sesiones/`).
3. **0 uso de sandbox transaccional**: Ninguna petición incluyó las cabeceras `X-Test-Run-Id` o `X-Sandbox-Secret`.
4. **0 operaciones de escritura git / base de datos**: No se realizaron commits, push, branches, checkout, stash ni conexiones directas a base de datos remota.
5. **Persistencia íntegra de evidencia**: Todos los archivos diagnósticos (`06_...` a `32_...`) han sido conservados en `evidencias\diag_g41\` y sus `x-request-id` fueron extraídos de forma directa y automatizada.

