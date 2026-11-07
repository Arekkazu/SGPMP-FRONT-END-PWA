# Fase 3 — Revisión Crítica y Verificación Estática del Caso TC-M05-G23 (RF-77)

**Fecha:** 2026-11-06  
**Módulo:** Módulo 5 (Costeo de Suministros)  
**Requerimiento:** RF-77 (Reporte de gastos acumulados por activo y exportación PDF/CSV)  
**Caso:** TC-M05-G23  
**Activo biológico:** 57 (INDIVIDUAL, fecha inicio ciclo 2026-01-01, gasto validado: 10.0000 COP)  
**Ambiente:** TEST oficial (`https://api.inmero.co` / API: `https://api.inmero.co/api-sgpmp-test`)  

---

## SECCIÓN A: Estado de la carpeta `resultados/`

1. **Estado actual:**
   - La carpeta `testing/test_testing/Modulo5/RF-77/TC-M05-G23/resultados/` fue creada con éxito.
   - Contiene únicamente el archivo marcador `.gitkeep` con tamaño 0 bytes.
   - No contiene ningún archivo `.json`, `.csv`, `.pdf` ni resultados de corridas previas.

2. **Evidencia en PowerShell:**
   ```powershell
   Get-ChildItem -Path "testing\test_testing\Modulo5\RF-77\TC-M05-G23\resultados"
   # Mode: -a---- Length: 0 Name: .gitkeep
   ```

3. **Mecanismo de generación condicional:**
   - Según el contrato de Fase 3 y 4, el archivo final `resultados/resultado_TC-M05-G23.json` **SOLO** debe escribirse si se define la variable de entorno `CYPRESS_REPORTE_EN_RESULTADOS=1` o `REPORTE_EN_RESULTADOS=1`.
   - Si no está presente, Cypress escribe reportes parciales en `evidencias/run_PARCIAL_<timestamp>.json` (o `run_INVALIDA_<timestamp>.json` si falla el sandbox).

---

## SECCIÓN B: Diagnóstico de `pnpm-lock.yaml` en la raíz

### B.1 Qué cambió
- Al ejecutar `pnpm add -D pdf-parse` durante la Fase 2 dentro de `testing/test_testing/Modulo5/RF-77/TC-M05-G23/`, `pnpm` detectó el archivo de bloqueo del workspace raíz (`C:\Users\Juansegutt\Integrador\SGPMP-FRONT-END-PWA\pnpm-lock.yaml`) y agregó una nueva entrada de importer.
- Resumen del `git diff --stat -- pnpm-lock.yaml`:
  `1 file changed, 71 insertions(+)`
- En el lockfile raíz se añadió:
  ```yaml
  importers:
    testing/test_testing/Modulo5/RF-77/TC-M05-G23:
      devDependencies:
        '@types/node':
          specifier: ^20.19.9
          version: 20.19.9
        '@types/pdf-parse':
          specifier: ^1.1.4
          version: 1.1.4
        cross-env:
          specifier: ^7.0.3
          version: 7.0.3
        cypress:
          specifier: ^13.17.0
          version: 13.17.0
        dotenv:
          specifier: ^16.4.7
          version: 16.4.7
        pdf-parse:
          specifier: ^1.1.4
          version: 1.1.4
        typescript:
          specifier: ^5.7.3
          version: 5.7.3
  ```
- **Cero** paquetes existentes de la aplicación web (`src/`) o dependencias globales fueron modificados o actualizados de versión.

### B.2 Por qué cambió
- En un monorepo administrado por pnpm, cuando un subdirectorio carece de su propio `pnpm-lock.yaml` local, cualquier comando `pnpm add` o `pnpm install` escala hacia el root del repositorio y actualiza el lockfile raíz global.
- El caso hermano `TC-M05-G13` no tocó el lockfile raíz porque ya poseía su propio archivo `pnpm-lock.yaml` local aislado en su carpeta.

### B.3 Riesgos
- **Riesgo funcional para la app:** NULO. Ninguna dependencia del frontend PWA fue tocada ni se alteraron versiones compartidas.
- **Riesgo en control de versiones:** Puede provocar ruido en git o conflictos de merge si otro desarrollador toca el `pnpm-lock.yaml` principal en su rama.

### B.4 Opciones de remediación
1. **Opción A (Conservar sin modificar por el agente):** Mantener el estado actual respetando la regla absoluta de no ejecutar git reset/checkout. El humano puede decidir si commitea la entrada del importer.
2. **Opción B (Reversión limpia por el humano):** El usuario humano puede ejecutar:
   ```powershell
   git restore pnpm-lock.yaml
   ```
   (o `git checkout HEAD -- pnpm-lock.yaml`).
3. **Opción C (Aislar lockfile local en G23):** Generar un lockfile exclusivo en la carpeta de G23 para que futuras ejecuciones de pnpm queden 100% contenidas.

---

## SECCIÓN C: Matriz de Revisión de los 9 Checkpoints (CP-01 a CP-09)

| Checkpoint | Nombre / Objetivo | Implementación / Archivo | Estado Revisión | Observación / Ajuste |
|---|---|---|---|---|
| **CP-01** | Sandbox + login Administrador | `tc-...cy.ts:140-155`<br>`commands.ts:210,309` | **CONFORME** | Valida confirmación del sandbox en backend antes de aceptar login. Credenciales ocultas con `{ log: false }`. No almacena secretos. |
| **CP-02** | Navegación a `/suministros/gastos` | `tc-...cy.ts:160-167`<br>`commands.ts:109` | **CONFORME** | Usa `visitar('/suministros/gastos')` respetando `APP_BASE_PATH`. Verifica visibilidad de `#gastos-desde`. |
| **CP-03** | Generar reporte UI (activo 57) | `tc-...cy.ts:172-210` | **CONFORME** | Captura `POST /suministros/reportes-gastos` -> 200, valida `gasto_total_acumulado = "10.0000"`, visualización del detalle y extrae `id_reporte`. |
| **CP-04** | Exportar CSV por UI | `tc-...cy.ts:215-248` | **CONFORME** | Captura `POST /exportacion` -> 201, valida nombre exacto `Gastos_57_2026-01-01_2026-07-31.csv`, vigencia de 24 horas y extrae `id_archivo`. |
| **CP-05** | Descarga y contenido CSV | `tc-...cy.ts:253-295` | **CONFORME** | Espera interceptor `getDescargaCsv`, valida `Content-Type: text/csv`, lee archivo descargado con 5 columnas exactas (`fecha,categoria,descripcion,monto_cop,estado`) y verifica suma = 10.0000 COP. |
| **CP-06** | Exportar PDF por UI | `tc-...cy.ts:300-333` | **CONFORME** | Clic en botón PDF, captura `POST /exportacion` -> 201, valida nombre `Reporte_Gastos_57_2026-01-01_2026-07-31.pdf`, vigencia 24 h y extrae `id_archivo`. |
| **CP-07** | Descarga binaria PDF | `tc-...cy.ts:338-365` | **CONFORME** | Espera `getDescargaPdf`, valida `Content-Type: application/pdf`, lee binario en disco y verifica magic bytes `%PDF-`. |
| **CP-08** | Contenido y estructura PDF | `tc-...cy.ts:370-390`<br>`cypress.config.js:143-158` | **CONFORME (con observación de logo)** | Usa `cy.task('leerPdf')` con `pdf-parse`. Valida 1 página, título `"Reporte de Gastos Acumulados"` y `"Fecha de generación:"`. Ver detalle de logo en Sección D. |
| **CP-09** | Rollback y aislamiento post-rollback | `tc-...cy.ts:395-475` | **CORREGIDO** | **Ajustado en Fase 3:** Valida que existan `idReporte`, `idArchivoCsv` y `idArchivoPdf` antes de consultar 404 fuera de sandbox. Si alguno falta, registra `FALLA` explícita detallando los faltantes sin llamadas inválidas. Aislamiento validado con token limpio sin sandbox. |

---

## SECCIÓN D: Análisis de la Implementación del Logo del PDF en Backend

### D.1 Cadena de responsabilidades en el Backend (`sgpmp-backend`)
1. **Puerto de Dominio (`LogoInstitucionalPort`):**
   - Archivo: `src/supplies/domain/repositories/logo_institucional_port.py:11-16`
   - Firma: `def ruta_logo(self, *, id_activo_biologico: Optional[int] = None, id_infraestructura: Optional[int] = None) -> Optional[str]`
   - Especificación: *"Ruta en disco del logo PNG/JPEG de la finca, o `None` si no hay uno utilizable."*

2. **Adaptador de Infraestructura (`LogoFincaM09Adapter`):**
   - Archivo: `src/supplies/infrastructure/adapters/logo_finca_m09_adapter.py:21-49`
   - Realiza consulta SQL cruzando `modulo9.identidad_visuales iv`, `modulo9.infraestructuras i` y `modulo2.activos_biologicos ab` buscando la versión más reciente con `iv.logo_path IS NOT NULL`.
   - Filtro de seguridad:
     ```python
     if not logo or not logo.lower().endswith((".png", ".jpg", ".jpeg")):
         return None
     ruta = os.path.join(DIRECTORIO_LOGOS, logo.removeprefix(RUTA_PUBLICA_LOGOS).lstrip("/"))
     return ruta if os.path.isfile(ruta) else None
     ```
   - Si no existe el registro en la base de datos o el archivo físico no reside en el contenedor/disco de TEST, retorna limpiamente `None`.

3. **Inyección en la Fábrica (`reporte_gastos_factory.py`):**
   - Archivo: `src/supplies/infrastructure/factories/reporte_gastos_factory.py:71-79`
   - En `build_exportar_reporte_gastos_use_case(db)` inyecta `logo_port=LogoFincaM09Adapter(db)`.

4. **Caso de Uso (`ExportarReporteGastosUseCase`):**
   - Archivo: `src/supplies/application/use_cases/reporte_gastos/exportar_reporte_gastos_use_case.py:200-203`
   - Invoca: `ruta_logo=self.logo_port.ruta_logo(id_activo_biologico=reporte.id_activo_biologico, id_infraestructura=reporte.id_infraestructura)`

5. **Motor de Renderizado ReportLab (`generador_archivos.py`):**
   - Archivo: `src/supplies/application/use_cases/exportacion/generador_archivos.py:89-91`
   - Comportamiento:
     ```python
     if doc.ruta_logo:
         elementos.append(Image(doc.ruta_logo, width=80, height=40, kind="proportional"))
     elementos.append(Paragraph(doc.titulo, estilos["Title"]))
     ```
   - El logo es estrictamente opcional y condicional ("logo si existe"). Si no hay logo utilizable, ReportLab construye el PDF directamente con el título, fecha y tabla de datos.

### D.2 Diagnóstico de los 2295 bytes en TEST
- En las pruebas de sonda de Fase 1c (`fase1c_admin_sonda.json`) y Fase 1d (`fase1d_admin_sonda.json`), el endpoint `GET /suministros/reportes-gastos/exportaciones/{id}` retornó exactamente **2295 bytes** (`application/pdf`).
- Un archivo PDF de ReportLab con encabezado institucional gráfico (stream binario PNG o JPEG embebido `/Subtype /Image`) pesa un mínimo de 6 a 15 KB (o cientos de KB según la compresión). Un tamaño de 2295 bytes corresponde con exactitud a la estructura base de un documento ReportLab con páginas, fuentes tipográficas integradas y tabla de 1 fila de datos **sin imágenes embebidas**.
- Por ende, en la base de datos de TEST, la finca asociada al activo biológico 57 no cuenta con un archivo físico de logotipo disponible en disco.
- **Implicación en CP-08:** En el spec actual, la comprobación incluye `const exito = tituloOk && fechaOk && paginasOk && tieneImagen;`. Si el ambiente TEST no tiene configurado un logo físico para este activo, `tieneImagen` será evaluado en `false`, registrando una falla técnica honesta que refleja la ausencia de logo en TEST.

---

## SECCIÓN E: Verificación Estática y Seguridad

1. **Compilación TypeScript (`tsc --noEmit`):**
   - Comando: `pnpm exec tsc --noEmit`
   - Salida: Exit code 0 (sin errores de sintaxis, tipado o tipos implícitos).

2. **Verificación de Cypress (`cypress verify`):**
   - Entorno saneado: `Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue`
   - Salida:
     ```text
     [SUCCESS] Verified Cypress! C:\Users\Juansegutt\AppData\Local\Cypress\Cache\13.17.0\Cypress
     ```

3. **Escaneo de Credenciales y Secretos:**
   - No hay correos, tokens ni contraseñas quemadas en el código fuente.
   - Las llamadas a `loginUI`, `cy.request` y las operaciones sensibles usan `{ log: false }`.
   - Variables cargadas estrictamente mediante `dotenv` desde `.env.test`.

4. **Estado Git (`git status --short`):**
   - **Frontend (`SGPMP-FRONT-END-PWA`):**
     - Modificado previamente: `pnpm-lock.yaml` (explicado en Sección B).
     - Carpetas del caso: `testing/test_testing/Modulo5/RF-77/TC-M05-G23/` (archivos del test y evidencias).
     - Ningún archivo de producción (`src/`) ha sido modificado.
   - **Backend (`sgpmp-backend`):**
     - Totalmente intacto respecto a este caso de prueba. Solo archivos previos existentes.

---
**Conclusión:** El caso TC-M05-G23 se encuentra completamente revisado, corregido y listo para la fase de ejecución controlada (Fase 4).

