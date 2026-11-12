# INFORME TÉCNICO DE QA — FASE 1E
## Verificación de Visibilidad y Oráculo de Datos (Rol Gestor de Granja)
### Caso Agrupado: TC-M05-G41 (RF-81: Consulta de Historial de Suministros por Activo)

---

## (1) RESUMEN EJECUTIVO (≤ 8 líneas)
1. Login de **Gestor de Granja** en TEST respondió **HTTP 200** (`2bd93ff1-d27e-4881-9388-7d67b11d63af`).
2. Al ejecutar el paso 2.2 (`GET /activos-biologicos?pagina=1&page_size=20`), el backend devolvió **HTTP 403 `ACCESO_DENEGADO`** (`914e2bea-a64f-4940-9b59-2e0f7f99a3a7`): *"Acceso denegado. Su rol no tiene permisos para realizar esta operación."*
3. El rol **Gestor de Granja** ve **0 activos** en `/activos-biologicos` porque dicho endpoint exige permiso `(29, R)` sobre `activos_biologicos`, asignado únicamente a `Admin, Prod, Vet, Ing`.
4. Conforme a la **PUERTA** (*"Si 2.2 no incluye el activo 1624, no hagas 2.3 a 2.7"*), se detuvo la ejecución tras el 403 y **no** se ejecutaron 2.3–2.7 ni se generó `evidencias\oraculo_D.json`.
5. En frontend, [useActivosSuministros.ts](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useActivosSuministros.ts#L19-L27) captura silenciosamente ese 403 dejando `SelectorActivo` vacío (`activos = []`) para que el usuario escriba el ID numérico manual.
6. Adicionalmente, [SelectorActivo.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx#L24-L35) usa `identificador` o `tipo + nombre_especie` y **nunca** `descripcion` (`SEED-M05-HIST-500` no aparecería en el texto ni aun con permiso `(29, R)`).
7. En backend, `_SQL_POR_CICLO` arma las claves de `desglose_por_ciclo` con `cp.nombre || ' #' || COALESCE(rs.id_gestion_fases::text, '-')`.
8. Cumplimiento total de reglas: 1 POST login + 1 GET, 0 sandbox, 0 escrituras, 0 fugas de credenciales/tokens.

---

## (2) BLOQUE 1 — CÓDIGO (SOLO LECTURA)

### 1.1 `SelectorActivo` y Obtención de Lista de Activos

#### Archivo completo [SelectorActivo.tsx](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx)

**Comando PowerShell:**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\src\supplies\components\SelectorActivo.tsx" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ }
```

**Salida cruda:**
```text
   1: // | Fecha      | Nombre   | Que se hizo |
   2: // |------------|----------|-------------|
   3: // | 2026-10-23 | Arekkazu | M05 RF-74..81: selector de activo con autocompletado que acepta el ID |
   4: import React, { useMemo } from 'react';
   5: import { Combobox } from '../../shared/design-system/Combobox';
   6: import { idDeCatalogo, etiquetaDeCatalogo } from '../../shared/lib/catalogo';
   7: import { humanizar } from '../../shared/lib/etiquetas';
   8: import { useT } from '../../shared/i18n/useT';
   9: import type { ActivoOpcion } from '../types';
  10: 
  11: interface Props {
  12:   id: string;
  13:   activos: ActivoOpcion[];
  14:   cargando?: boolean;
  15:   /** Texto escrito (nombre sugerido o ID). */
  16:   value: string;
  17:   onChange: (texto: string, idActivo: number | null) => void;
  18:   required?: boolean;
  19:   error?: string;
  20:   label?: string;
  21:   onBlur?: () => void;
  22: }
  23: 
  24: export function nombreActivo(a: ActivoOpcion): string {
  25:   return a.identificador?.trim() || `${humanizar(a.tipo)} ${a.nombre_especie ?? ''}`.trim();
  26: }
  27: 
  28: /** Combobox de activos (regla QA: se escribe el nombre o el ID; el backend valida el ID). */
  29: export function SelectorActivo({ id, activos, cargando, value, onChange, required, error, label, onBlur }: Props) {
  30:   const { t } = useT('supplies');
  31:   const catalogo = useMemo(() => activos.map((a) => ({ id: a.id_activo_biologico, nombre: nombreActivo(a) })), [activos]);
  32:   const opciones = useMemo(() => activos.map((a) => ({
  33:     valor: etiquetaDeCatalogo(nombreActivo(a), a.id_activo_biologico),
  34:     detalle: [a.nombre_especie, a.nombre_infraestructura, a.nombre_estado].filter(Boolean).join(' Â· '),
  35:   })), [activos]);
  36: 
  37:   return (
  38:     <Combobox
  39:       id={id}
  40:       label={label ?? t('comun.activo')}
  41:       opciones={opciones}
  42:       value={value}
  43:       onChange={(texto) => onChange(texto, idDeCatalogo(texto, catalogo))}
  44:       onBlur={onBlur}
  45:       required={required}
  46:       error={error}
  47:       placeholder={cargando ? t('comun.cargando') : t('comun.activo_placeholder')}
  48:       hint={t('comun.activo_hint')}
  49:     />
  50:   );
  51: }
```

#### Hook y llamada API que obtiene la lista de activos

**Comando PowerShell (`useActivosSuministros.ts`):**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\src\supplies\hooks\useActivosSuministros.ts" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ }
```

**Salida cruda:**
```text
   1: // | Fecha      | Nombre   | Que se hizo |
   2: // |------------|----------|-------------|
   3: // | 2026-10-23 | Arekkazu | M05 RF-74..81: catÃ¡logo de activos para elegir a quiÃ©n se le registra |
   4: import { useEffect, useState } from 'react';
   5: import { activosApi } from '../api/activosApi';
   6: import type { ActivoOpcion } from '../types';
   7: 
   8: const MAX_PAGINAS = 5; // ponytail: hasta 500 activos sugeridos; el campo acepta igual cualquier ID.
   9: 
  10: /** Sugerencias del selector de activo. Si falla, el selector sigue aceptando el ID escrito. */
  11: export function useActivosSuministros() {
  12:   const [activos, setActivos] = useState<ActivoOpcion[]>([]);
  13:   const [cargando, setCargando] = useState(true);
  14: 
  15:   useEffect(() => {
  16:     let vigente = true;
  17:     (async () => {
  18:       const todos: ActivoOpcion[] = [];
  19:       try {
  20:         for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
  21:           const r = await activosApi.listar(pagina);
  22:           todos.push(...r.registros);
  23:           if (pagina >= r.total_paginas) break;
  24:         }
  25:       } catch {
  26:         // sin sugerencias: el campo acepta el ID
  27:       }
  28:       if (vigente) { setActivos(todos); setCargando(false); }
  29:     })();
  30:     return () => { vigente = false; };
  31:   }, []);
  32: 
  33:   return { activos, cargando };
  34: }
```

**Comando PowerShell (`activosApi.ts`):**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\src\supplies\api\activosApi.ts" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ }
```

**Salida cruda:**
```text
   1: // | Fecha      | Nombre   | Que se hizo |
   2: // |------------|----------|-------------|
   3: // | 2026-10-23 | Arekkazu | M05 RF-74..81: activos para el selector del mÃ³dulo |
   4: import { http } from '../../shared/api/http';
   5: import type { ActivoOpcion, InstanciaCiclo } from '../types';
   6: 
   7: interface ActivosPaginados { registros: ActivoOpcion[]; total_paginas: number }
   8: 
   9: /** Activos que el usuario puede ver (RLS por finca). El backend pagina de a 100 como mÃ¡ximo. */
  10: export const activosApi = {
  11:   async listar(pagina = 1): Promise<ActivosPaginados> {
  12:     return (await http.get<ActivosPaginados>('/activos-biologicos', { params: { pagina, page_size: 100 } })).data;
  13:   },
  14:   /** Instancias de ciclo del activo (id_gestion_fases): la clave de RF-78/RF-79. */
  15:   async ciclos(idActivo: number): Promise<InstanciaCiclo[]> {
  16:     return (await http.get<{ fases: InstanciaCiclo[] }>(`/activos-biologicos/${idActivo}/fases`)).data.fases;
  17:   },
  18: };
```

**Comando PowerShell (`catalogo.ts` y `etiquetas.ts`):**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\src\shared\lib\catalogo.ts" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ }
Get-Content -Path "C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\src\shared\lib\etiquetas.ts" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ }
```

**Salida cruda (`catalogo.ts`):**
```text
   1: // | Fecha      | Nombre   | Que se hizo |
   2: // |------------|----------|-------------|
   3: // | 2026-11-02 | Arekkazu | AJF-02 RF-57: resolver el texto a medias de un catÃ¡logo al salir del campo |
   4: import { normalizar } from '../hooks/useBusqueda';
   5: 
   6: /**
   7:  * Campo de catÃ¡logo con autocompletado (Combobox): se acepta el ID tal cual,
   8:  * con o sin Â«#Â» (lo usan los scripts de pruebas), la sugerencia elegida
   9:  * Â«Nombre (#id)Â» o el nombre exacto. El backend valida el ID.
  10:  */
  11: export function idDeCatalogo(texto: string, opciones: { id: number; nombre: string }[]): number | null {
  12:   const v = (texto ?? '').trim();
  13:   const id = v.match(/^#?\s*(\d+)$/)?.[1] ?? v.match(/\(#(\d+)\)$/)?.[1];
  14:   if (id) return Number(id) || null;
  15:   return opciones.find((o) => o.nombre.toLowerCase() === v.toLowerCase())?.id ?? null;
  16: }
  17: 
  18: /** Â«Nombre (#id)Â», el texto que deja el combobox al elegir una opciÃ³n. */
  19: export function etiquetaDeCatalogo(nombre: string, id: number): string {
  20:   return `${nombre} (#${id})`;
  21: }
...
```

**Salida cruda (`etiquetas.ts`):**
```text
  12: export function humanizar(codigo: string | null | undefined): string {
  13:   if (!codigo) return 'â€”';
  14:   // T-22: "pH del agua" ya viene escrito para personas; bajarlo todo daba "Ph del agua".
  15:   if (!codigo.includes('_') && /\p{Ll}/u.test(codigo)) return codigo;
  16:   const texto = codigo.replace(/[_\s]+/g, ' ').trim().toLowerCase();
  17:   return texto.charAt(0).toUpperCase() + texto.slice(1);
  18: }
```

**Análisis observado de 1.1:**
- **Endpoint y parámetros**: `useActivosSuministros()` ([useActivosSuministros.ts:11-34](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useActivosSuministros.ts#L11-L34)) invoca `activosApi.listar(pagina)` ([activosApi.ts:11-13](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/api/activosApi.ts#L11-L13)), que ejecuta `GET /activos-biologicos` con `{ params: { pagina, page_size: 100 } }` iterando desde `pagina = 1` hasta `min(MAX_PAGINAS=5, total_paginas)`.
- **Campos usados para cada opción**:
  - `valor` (texto principal de la opción y valor seleccionado, [SelectorActivo.tsx:33](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx#L33)): `etiquetaDeCatalogo(nombreActivo(a), a.id_activo_biologico)`, que produce `${nombre} (#${id_activo_biologico})`.
  - `detalle` (texto secundario, [SelectorActivo.tsx:34](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx#L34)): `[a.nombre_especie, a.nombre_infraestructura, a.nombre_estado].filter(Boolean).join(' · ')`.
- **Qué muestra cuando `identificador` es `null`**: Según `nombreActivo(a)` ([SelectorActivo.tsx:24-26](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx#L24-L26)):
  `a.identificador?.trim() || `${humanizar(a.tipo)} ${a.nombre_especie ?? ''}`.trim()`.
  Es decir, si `identificador` es `null`, toma `humanizar(a.tipo)` (p. ej. `"Poblacional"`) seguido de `nombre_especie` (p. ej. `"Poblacional Bovino (#1624)"` o `"Poblacional (#1624)"` si `nombre_especie` fuese `null`). **No utiliza el campo `descripcion` en ningún lugar** (ni siquiera existe en la interfaz `ActivoOpcion` de [types.ts:14-21](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/types.ts#L14-L21)).
- **Comportamiento ante fallo del listado**: El bloque `try { ... } catch { // sin sugerencias: el campo acepta el ID }` de [useActivosSuministros.ts:19-27](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useActivosSuministros.ts#L19-L27) ignora cualquier error HTTP (incluido el 403) y deja `activos = []`, permitiendo únicamente digitar el ID numérico en el input (`idDeCatalogo` acepta `\d+`).

---

### 1.2 `desglose_por_ciclo` en el Repositorio de Lectura del Historial

**Comando PowerShell (`Get-ChildItem`):**
```powershell
Get-ChildItem -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src" -Recurse -Filter "*historial*repository*" | Select-Object FullName
```

**Salida cruda (archivo de interés en M05):**
```text
C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py
```

**Comando PowerShell (`Select-String` con 8 líneas de contexto):**
```powershell
Select-String -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py" -Pattern "_SQL_POR_CICLO|desglose_por_ciclo" -Context 8,8
```

**Salida cruda:**
```text
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:85:    f"""
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:86:    SELECT rs.tipo_suministro AS tipo,
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:87:           COUNT(*) AS total, COALESCE(SUM(rs.costo_registro), 0) AS monto
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:88:    {_JOINS} {_WHERE}
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:89:    GROUP BY 1
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:90:    """
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:91:)
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:92:
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:93:_SQL_POR_CICLO = text(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:94:    f"""
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:95:    SELECT cp.nombre || ' #' || COALESCE(rs.id_gestion_fases::text, '-') AS ciclo,
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:96:           COUNT(*) AS total, COALESCE(SUM(rs.costo_registro), 0) AS monto
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:97:    {_JOINS} {_WHERE}
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:98:    GROUP BY cp.nombre, rs.id_gestion_fases
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:99:    """
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:100:)
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:101:
...
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:177:        params = _params(filtros, ids_activos_permitidos)
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:178:
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:179:        offset = (filtros.pagina - 1) * filtros.registros_por_pagina
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:180:        filas_pagina = self.db.execute(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:181:            _SQL_PAGINA, {**params, "limite": filtros.registros_por_pagina, "offset": offset}
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:182:        ).mappings().all()
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:183:        total_fila = self.db.execute(_SQL_TOTAL, params).mappings().one()
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:184:        por_tipo = self.db.execute(_SQL_POR_TIPO, params).mappings().all()
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:185:        por_ciclo = self.db.execute(_SQL_POR_CICLO, params).mappings().all()
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:186:
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:187:        lineas = [
...
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:207:            )
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:208:            for f in filas_pagina
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:209:        ]
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:210:        return ResultadoHistorialSuministro(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:211:            lineas=lineas,
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:212:            total_registros_filtrados=total_fila["total"],
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:213:            monto_total_filtrado=total_fila["monto"] or Decimal("0"),
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:214:            desglose_por_tipo_suministro={f["tipo"]: {"total": f["total"], "monto": f["monto"]} for f in por_tipo},
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:215:            desglose_por_ciclo={f["ciclo"]: {"total": f["total"], "monto": f["monto"]} for f in por_ciclo},
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py:216:        )
```

**Comando PowerShell (verificación de alias `cp` en `_JOINS`):**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src\supplies\infrastructure\repositories\historial_suministro_read_repository.py" | ForEach-Object -Begin { $i = 1 } -Process { "{0,4}: {1}" -f $i++, $_ } | Select-Object -Skip 42 -First 12
```

**Salida cruda:**
```text
  43: _JOINS = """
  44:     FROM modulo5.registro_suministro rs
  45:     JOIN modulo2.activos_biologicos ab ON ab.id_activo_biologico = rs.id_activo_biologico
  46:     JOIN modulo9.especies esp ON esp.id_especie = ab.id_especie
  47:     JOIN modulo9.ciclos_productivos cp ON cp.id_ciclo_productivo = rs.id_ciclo_productivo
  48:     LEFT JOIN modulo5.registros_consumo_alimentos rca ON rca.id_registro_rf75 = rs.id_registro_rf75
  49:     LEFT JOIN modulo5.registros_medicamentos rm ON rm.id_registro_rf76 = rs.id_registro_rf76
  50:     LEFT JOIN modulo2.gestiones_fases gf ON gf.id_gestion_fases = rs.id_gestion_fases
  51: """
```

**Análisis observado de 1.2:**
- La clave de `desglose_por_ciclo` **no** es solo el nombre: se construye en SQL ([historial_suministro_read_repository.py:95-98](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L95-L98)) concatenando el nombre del ciclo productivo (`modulo9.ciclos_productivos.nombre`) + `" #"` + el ID de instancia de fase (`rs.id_gestion_fases::text`, o `'-'` si es `NULL`):
  `cp.nombre || ' #' || COALESCE(rs.id_gestion_fases::text, '-') AS ciclo`
- Luego la línea 215 mapea directamente `{f["ciclo"]: {"total": f["total"], "monto": f["monto"]} for f in por_ciclo}`.

---

## (3) BLOQUE 2 — DATOS EN TEST (SOLO GET, ROL GESTOR DE GRANJA)

### 2.1 Login por API (Gestor de Granja)
Se utilizó exactamente el contrato del endpoint `POST /sesiones/` (`LoginDTO`: `{ "correo_electronico": GESTOR_GRANJA_EMAIL, "contrasena": GESTOR_GRANJA_PASSWORD }` desde `SGPMP-FRONT-END-PWA\.env.test`, sin imprimir ni persistir credenciales ni tokens).

| Campo | Valor Observado |
|-------|-----------------|
| **Método / URL** | `POST https://api.inmero.co/api-sgpmp-test/sesiones/` |
| **HTTP Status** | `200` |
| **Latencia** | `915 ms` |
| **Hora UTC** | `2026-11-11T02:45:55.364Z` |
| **x-request-id** | `2bd93ff1-d27e-4881-9388-7d67b11d63af` |
| **Mensaje respuesta** | `"Sesión iniciada exitosamente. Se ha cerrado automáticamente la sesión activa en otros dispositivos por políticas de seguridad de sesión única."` |
| **Archivo diagnóstico** | `evidencias\diag_g41\33_login_gestor_granja.json` (`token` y `set-cookie` redactados como `[REDACTED]`) |

### 2.2 Listado de Activos Visibles para Gestor de Granja (`GET /activos-biologicos`)

| Página | Método / URL | HTTP | Latencia | Hora UTC | x-request-id | error_code | message | Archivo |
|:------:|--------------|:----:|:--------:|:--------:|:------------:|:----------:|---------|---------|
| **1** | `GET https://api.inmero.co/api-sgpmp-test/activos-biologicos?pagina=1&page_size=20` | `403` | `167 ms` | `2026-11-11T02:45:55.546Z` | `914e2bea-a64f-4940-9b59-2e0f7f99a3a7` | `ACCESO_DENEGADO` | `"Acceso denegado. Su rol no tiene permisos para realizar esta operación."` | `evidencias\diag_g41\34_activos_p1.json` |

- **Activos visibles reportados para Gestor de Granja vía `/activos-biologicos`**: **Ninguno (0 activos)**, debido a que el endpoint rechazó la petición con **HTTP 403 `ACCESO_DENEGADO`**.
- **¿Aparece el activo 1624 (`SEED-M05-HIST-500`)?**: **NO aparece.**

#### Demostración literal en código del rechazo 403 sobre `GET /activos-biologicos`

**Comando PowerShell (router M02):**
```powershell
Select-String -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py" -Pattern "_RECURSO = 29|def listar_activos" -Context 6,6
```

**Salida cruda:**
```text
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:219:_RECURSO = 29                  # modulo1.recursos: 'activos_biologicos'
...
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:491:@router.get(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:492:    '',
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:493:    response_model=ActivosPaginadosResponse,
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:494:    dependencies=[Depends(require_permission_m02(_RECURSO, 2, rf_origen='RF33'))],
...
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\biological_assets\infrastructure\routers\activo_biologico_router.py:502:def listar_activos(
```

**Comando PowerShell (matriz documentada del recurso 29):**
```powershell
Get-Content -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\anotaciones\modulo_2\api_reference_m02_activos_biologicos.md" -TotalCount 85 | Select-Object -Last 15
```

**Salida cruda:**
```text
## Endpoints

### Registro y consulta general — recurso 29 (`activos_biologicos`)

| Método | Ruta | Permiso | Roles autorizados | Use Case |
|--------|------|---------|--------------------|----------|
| `POST` | `/` | `(29, C)` | Admin, Prod, Vet, Ing | `RegistrarActivoBiologicoUseCase` |
| `GET` | `/` | `(29, R)` | Admin, Prod, Vet, Ing | `ListarActivosUseCase` |
| `GET` | `/{id_activo}` | `(29, R)` | Admin, Prod, Vet, Ing | `ConsultarActivoUseCase` |
| `PATCH` | `/{id_activo}` | `(29, U)` | Admin, Prod, Vet, Ing | `ActualizarActivoIndividualUseCase` |
```

**Comando PowerShell (`src\shared\rbac.py`):**
```powershell
Select-String -Path "C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py" -Pattern "Acceso denegado" -Context 8,4
```

**Salida cruda:**
```text
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:155:    if not tiene():
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:156:        raise AuthorizationError(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:157:            code="ACCESO_DENEGADO",
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:158:            message=(
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:159:                mensaje_denegado
> C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:160:                or "Acceso denegado. Su rol no tiene permisos para realizar esta operación."
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:161:            ),
  C:\Users\Juansegutt\Integrador\sgpmp-backend\src\shared\rbac.py:162:        )
```

### Activación de PUERTA — Pasos 2.3 a 2.7 NO ejecutados
En estricto cumplimiento de la regla de control del prompt:
> **PUERTAS**: *"Si 2.2 no incluye el activo 1624, no hagas 2.3 a 2.7; reporta qué activos sí ve el Gestor."*

Al haber recibido **HTTP 403 `ACCESO_DENEGADO`** en 2.2 (con 0 activos visibles y sin aparición del ID `1624`), **no se ejecutaron** los pasos **2.3, 2.4, 2.5, 2.6 ni 2.7** (por tanto, **`evidencias\oraculo_D.json` NO fue generado**), ni se realizó un segundo login (Regla 1).

---

## (4) OBSERVADO VS HIPÓTESIS

### OBSERVADO (Comprobado directamente en código y respuestas HTTP de TEST)
1. **Login exitoso de Gestor de Granja**: `POST /sesiones/` devolvió HTTP `200` (`2bd93ff1-d27e-4881-9388-7d67b11d63af`).
2. **Bloqueo RBAC en `GET /activos-biologicos`**: `GET /activos-biologicos?pagina=1&page_size=20` con el JWT de Gestor de Granja devolvió HTTP `403`, `error_code: "ACCESO_DENEGADO"`, `message: "Acceso denegado. Su rol no tiene permisos para realizar esta operación."` (`914e2bea-a64f-4940-9b59-2e0f7f99a3a7`).
3. **Causa demostrada en código del 403**: El endpoint `GET /activos-biologicos` (`activo_biologico_router.py:494`) exige el permiso `(29, 2)` (`activos_biologicos`, Leer), el cual está otorgado solo a `Admin, Prod, Vet, Ing` (`api_reference_m02_activos_biologicos.md:78`), excluyendo al rol `Gestor de Granja`.
4. **Impacto observado en UI (`SelectorActivo`)**: `useActivosSuministros()` ([useActivosSuministros.ts:19-27](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/hooks/useActivosSuministros.ts#L19-L27)) envuelve la llamada a `GET /activos-biologicos` en un `try/catch` que descarta la excepción HTTP 403, dejando el catálogo vacío (`activos = []`) para Gestor de Granja. En este rol, la UI exige ingresar manualmente el ID (`1624`) porque el autocompletado nunca recibe opciones.
5. **Omisión de `descripcion` en `SelectorActivo`**: [SelectorActivo.tsx:24-35](file:///c:/Users/Juansegutt/Integrador/SGPMP-FRONT-END-PWA/src/supplies/components/SelectorActivo.tsx#L24-L35) solo muestra `identificador` o `${humanizar(tipo)} ${nombre_especie}`. No lee ni muestra `descripcion` (donde el DBA declaró haber puesto `SEED-M05-HIST-500`).
6. **Formato de clave de `desglose_por_ciclo`**: [historial_suministro_read_repository.py:95,215](file:///c:/Users/Juansegutt/Integrador/sgpmp-backend/src/supplies/infrastructure/repositories/historial_suministro_read_repository.py#L95) construye cada clave como `cp.nombre || ' #' || COALESCE(rs.id_gestion_fases::text, '-')`.

### HIPÓTESIS (No verificadas por detención obligatoria en PUERTA 2.2)
1. **Acceso directo al historial con ID `1624`**: Es posible que `GET /suministros/historial?id_activo_biologico=1624` sí devuelva HTTP `200` para Gestor de Granja si se consulta directamente sin pasar por `GET /activos-biologicos` (ya que `/suministros/historial` valida recurso `52` en lugar de `29`, y `AlcanceActivoM02Adapter` filtra por fincas asignadas si el Gestor de Granja tiene asignada la finca 81 en TEST). Esto no se comprobó porque la PUERTA prohibió ejecutar los pasos 2.3–2.7 tras el fallo de 2.2.
2. **Desalineación UI vs RBAC de M02**: El comentario en `useActivosSuministros.ts:26` (*"sin sugerencias: el campo acepta el ID"*) sugiere que el frontend ya contemplaba que roles de M05 sin permiso `(29, R)` (como Gestor de Granja, Contador o Revisor Fiscal) no tendrían sugerencias del listado `/activos-biologicos`.

---

## (5) NO DETERMINABLE
Por activación estricta de la **PUERTA** tras 2.2 y restricción de **1 único login** (Regla 1), quedan como **NO DETERMINABLE** en TEST en esta fase:
1. Los datos reales devueltos por `GET /suministros/historial?id_activo_biologico=1624` bajo Gestor de Granja (HTTP, `total_registros_filtrados`, `monto_total_filtrado`, `total_paginas`, `nivel_volumen`, `datos_contexto_no_disponibles`, `datos_actualizados_hasta`, `desglose_por_tipo_suministro`, `desglose_por_ciclo`).
2. La comprobación de las cifras declaradas por el DBA (`500` filas, `SUM(costo_registro) = 63.753.757,50`, fases `701/702/703` = `150/150/200`, rangos de costos/fechas por fase, desglose `ALIMENTO 63/62`, `MEDICAMENTO 62/63`, `SERVICIO_VETERINARIO 62/63`, `INSEMINACION 62/63`, orden `fecha_aplicacion DESC` y ausencia de duplicados).
3. El comportamiento de paginación por defecto (sin `registros_por_pagina`) y de `registros_por_pagina=201` (422 vs clamping).
4. Los resultados en memoria y contra la API de los filtros combinados y simples (`2.6 a`, `b`, `c`, `d`), así como el archivo `evidencias\oraculo_D.json` (no generado).
5. La finca asignada en TEST al usuario de `GESTOR_GRANJA_EMAIL` y la verificación en vivo de si `AlcanceActivoM02Adapter` le permite consultar el activo `1624` (finca 81).

---

## (6) REGISTRO DE TODAS LAS PETICIONES HTTP (FASE 1E)

Total ejecutado: **1 POST (login) + 1 GET = 2 peticiones** (límite máximo permitido: 30 GET).

| # | Método | URL Completa (Sin Tokens) | HTTP | Latencia | Hora UTC | x-request-id | Archivo Crudo |
|---|:------:|---------------------------|:----:|:--------:|:--------:|:------------:|---------------|
| 1 | `POST` | `https://api.inmero.co/api-sgpmp-test/sesiones/` | 200 | 915 ms | `2026-11-11T02:45:55.364Z` | `2bd93ff1-d27e-4881-9388-7d67b11d63af` | `evidencias\diag_g41\33_login_gestor_granja.json` |
| 2 | `GET` | `https://api.inmero.co/api-sgpmp-test/activos-biologicos?pagina=1&page_size=20` | 403 | 167 ms | `2026-11-11T02:45:55.546Z` | `914e2bea-a64f-4940-9b59-2e0f7f99a3a7` | `evidencias\diag_g41\34_activos_p1.json` |

---

## (7) CONFIRMACIÓN DE SEGURIDAD Y COMPROBACIÓN EXPLÍCITA
1. **Redacción en evidencia cruda**: En `33_login_gestor_granja.json` se redactaron a `[REDACTED]` tanto `cuerpo.token` como la cabecera de respuesta `cabeceras_respuesta.set-cookie`. Ningún archivo de `diag_g41\` almacena la cabecera `Authorization` ni el payload del login.
2. **Comprobación explícita sobre `fase1e_G41.md`, `diag_g41\` y `oraculo_D.json`**:
   - Búsqueda de secretos reales de `.env.test` (`GESTOR_GRANJA_EMAIL`, `GESTOR_GRANJA_PASSWORD`, `TEST_SANDBOX_SECRET`, `VET_*`, `REVISOR_FISCAL_*`, `ADMIN_*`) en `fase1e_G41.md` y en todos los archivos `diag_g41\*.json` → `SecretHits=0`.
   - Búsqueda de tokens reales (`eyJ...`, `refresh_token=...`, `Authorization: Bearer ...`) → 0 fugas reales (las únicas coincidencias de patrón fueron la cadena literal de documentación del filtro en este informe y esquemas de `01_openapi.json`).
   - `Test-Path ...\evidencias\oraculo_D.json` → `False` (no creado por detención en PUERTA 2.2).
3. **Sin sandbox, sin escrituras y sin scripts residuales**: El script temporal usado en el directorio scratch fue eliminado tras el sondeo (`Removed scratch probe script`), no se envió ninguna cabecera `X-Test-Run-Id` / `X-Sandbox-Secret`, no se tocó ningún archivo existente del repositorio y la salida en consola no imprimió contraseñas, tokens ni secretos.
