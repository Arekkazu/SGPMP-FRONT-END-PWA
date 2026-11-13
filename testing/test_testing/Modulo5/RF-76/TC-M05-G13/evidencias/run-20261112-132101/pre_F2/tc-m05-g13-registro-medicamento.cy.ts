/// <reference types="cypress" />
// | Fecha      | Nombre                    | Que se hizo                                                          |
// |------------|---------------------------|----------------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: registro de medicamento INDIVIDUAL y POBLACIONAL    |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: diagnostico CP-01 y reporte condicional de sandbox |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: diagnostico de login CP-01 y retries 0          |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: soporte APP_BASE_PATH en rutas de CP-01 y CP-02 |
// | 2026-11-12 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: A1-A6 reintento 1, fuente, A3 estricto, T00/T99 y trazas |
// | 2026-11-12 | Juan Sebastian Gutierrez  | C1-C7 reintento 1 (navegador limpio tras T00, guarda retries/screenshots, correos_reales, CP-07/12 no alcanzado, capturas, traza auth) |
// | 2026-11-12 | Juan Sebastian Gutierrez  | E1-E3: SPA descargada antes del rollback, guarda de ambiente de permisos, CP-06 según RF-76 Proceso 10 |
// =====================================================================
// TC-M05-G13 · RF-76 · CU03 · Prioridad Alta
// Registro de aplicación de medicamento según modalidad (POST /suministros/medicamentos)
//   Sub-caso 1 INDIVIDUAL  → activo 778 (finca 57)
//   Sub-caso 2 POBLACIONAL → activo 776 (finca 57, cantidad_actual = 10 → dosis 20 = 2,0/ind.)
// Rol: Veterinario (VET_EMAIL / VET_PASSWORD de .env.test). Ambiente: TEST oficial.
// Todo dentro del Sandbox Transaccional: startSandbox ANTES del login, rollback al final.
//
// Registro de checkpoints: cada CP arranca en FALLA («no alcanzado») y se sobrescribe
// cuando se evalúa. Las comprobaciones de CP no usan `should`, para que un CP fallido
// (p. ej. CP-09/CP-10, defecto conocido) no impida evaluar los siguientes. El último it()
// hace fallar la corrida si quedó al menos una FALLA (exit code honesto).
// =====================================================================
import { type ResumenSandbox, rutaApp, appBasePath, extraerRequestId, registrarTraza, sanitizarCuerpoMed } from './commands';

type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }
type IdCp =
  | 'CP-01' | 'CP-02' | 'CP-03' | 'CP-04' | 'CP-05' | 'CP-06' | 'CP-07'
  | 'CP-08' | 'CP-09' | 'CP-10' | 'CP-11' | 'CP-12' | 'CP-13' | 'CP-14';

const TC = 'TC-M05-G13';
const ACTIVO_IND = 778;
const ACTIVO_POB = 776;
const CANTIDAD_POB = 10;
const DOSIS_POB = 2 * CANTIDAD_POB; // 20 → dosis_por_individuo = 2,0
const MEDICAMENTO = 'Oxitetraciclina';
const VETERINARIO = 'Dr. Pérez';
const MOTIVO = 'Tratamiento de infección respiratoria';
const RUN_ID = `tc-m05-g13-${Date.now()}`;

const ESPERADOS: Record<IdCp, { paso: string; esperado: string; fuente: string }> = {
  'CP-01': { paso: 'CP-01 Sandbox + login Veterinario', esperado: 'Sandbox aceptado por el backend antes del login y ruta distinta de /login', fuente: 'RF-76 Precondiciones 1 (RF-02); Actores (Veterinario); procedimiento QA del sandbox' },
  'CP-02': { paso: 'CP-02 Navegación Suministros → Medicamentos', esperado: 'Ruta /suministros/medicamentos y título «Aplicación de medicamentos» visible', fuente: 'RF-76 Proceso 1' },
  'CP-03': { paso: 'CP-03 Abrir formulario de registro', esperado: 'Botón «Registrar aplicación» habilitado; se abre role=dialog', fuente: 'RF-76 Proceso 3' },
  'CP-04': { paso: 'CP-04 Llenar formulario INDIVIDUAL (activo 778)', esperado: 'Campos diligenciados, fecha por defecto = hoy (Bogotá), hora 08:00 y sin errores de campo', fuente: 'RF-76 Proceso 4-5; Entradas (fecha_aplicacion, hora_aplicacion)' },
  'CP-05': { paso: 'CP-05 Guardar INDIVIDUAL → respuesta API', esperado: '201 (200 solo si ya estaba EN_TRATAMIENTO); VALIDADO; fecha_fin_retiro = hoy+7; costo_total_medicamento = 5000; dosis_por_individuo = null; body sin dosis_por_individuo', fuente: 'RF-76 Proceso 8a; Restricción 6; Salida 1 y 4; HTTP según openapi TEST; VALIDADO según nota del caso G13' },
  'CP-06': { paso: 'CP-06 UI tras registrar INDIVIDUAL', esperado: 'Toast de éxito con el resumen del registro, incluida la fecha de fin de retiro (hoy+7)', fuente: 'RF-76 Proceso 10; Salida 6' },
  'CP-07': { paso: 'CP-07 Estado del activo 778 (RF-44)', esperado: 'GET /activos-biologicos/778 → EN_TRATAMIENTO', fuente: 'RF-76 CA-3; Restricción 7 (vía RF-44)' },
  'CP-08': { paso: 'CP-08 Precondición activo 776', esperado: 'GET /activos-biologicos/776 → ACTIVO, POBLACIONAL, cantidad_actual = 10', fuente: 'RF-76 Proceso 2; Dependencia RF-36 (cantidad_actual)' },
  'CP-09': { paso: 'CP-09 Cantidad actual visible en el formulario (776)', esperado: 'Al elegir #776 se muestra la cantidad actual (10) en solo lectura', fuente: 'RF-76 Proceso 4 (POBLACIONAL: cantidad_actual en solo lectura)' },
  'CP-10': { paso: 'CP-10 Dosis por individuo en vivo (776)', esperado: 'Al escribir dosis 20 aparece la dosis por individuo 2,0 en el formulario', fuente: 'RF-76 Proceso 4 (POBLACIONAL: dosis_por_individuo calculada en tiempo real)' },
  'CP-11': { paso: 'CP-11 Guardar POBLACIONAL → respuesta API', esperado: '201 (200 solo si ya estaba EN_TRATAMIENTO); VALIDADO; dosis_por_individuo = "2.0000"; costo_total_medicamento = 4000; fecha_fin_retiro = hoy+3', fuente: 'RF-76 CA-2; Restricciones 6 y 8; Proceso 8a; Salida 3 y 4; HTTP según openapi TEST' },
  'CP-12': { paso: 'CP-12 Estado del activo 776 (RF-44)', esperado: 'GET /activos-biologicos/776 → EN_TRATAMIENTO', fuente: 'RF-76 CA-3; Restricción 7 (vía RF-44)' },
  'CP-13': { paso: 'CP-13 dosis_por_individuo enviada en el body (999)', esperado: '4xx, o 2xx con dosis_por_individuo = "2.0000"; nunca queda guardado 999', fuente: 'RF-76 Restricción 8 (dosis_por_individuo calculada y de solo lectura); nota 2 del caso G13' },
  'CP-14': { paso: 'CP-14 Rollback del sandbox y verificación fuera de él', esperado: 'Rollback 2xx; sin sandbox no aparecen los registros de la corrida y 778/776 conservan su estado inicial | Verificado por API: T99 vs T00 (listado completo por activo: total, id máximo y ausencia de los ids creados)', fuente: 'Procedimiento QA del sandbox transaccional (no es requisito de RF-76)' },
};
const ORDEN = Object.keys(ESPERADOS) as IdCp[];

const resultados = new Map<IdCp, Checkpoint>();
for (const id of ORDEN) {
  resultados.set(id, { ...ESPERADOS[id], obtenido: 'No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).', estado: 'FALLA' });
}
function registrar(id: IdCp, ok: boolean, obtenido: string): void {
  resultados.set(id, { ...ESPERADOS[id], obtenido, estado: ok ? 'OK' : 'FALLA' });
  cy.log(`${id} → ${ok ? 'OK' : 'FALLA'} · ${obtenido}`);
}

// ── Contexto compartido entre it() (testIsolation:false, una sola sesión) ──
interface SnapshotListado {
  http: number;
  completo: boolean;
  total: number;
  items_count: number;
  id_maximo: number | null;
  ids: number[];
  x_request_id: string;
}
interface SnapshotInocuidad {
  run_id: string;
  rollback_http: number;
  activos: Record<number, { http: number; estado: string; x_request_id: string }>;
  medicamentos: Record<number, SnapshotListado>;
  auditoria?: { http: number; total?: number; id_maximo?: number | null; x_request_id: string };
}

interface CorreoReal {
  paso: string;
  activo: number;
  id_registro_medicamento: number | null;
  periodo_retiro_dias: number;
  hora_utc: string;
  http: number;
}

interface CheckpointRetirado {
  paso: string;
  motivo: string;
}

const ctx = {
  hoy: '',
  stagingDir: '',
  reintento: 0,
  ambienteInvalido: null as string | null,
  sandboxOk: false,
  loginOk: false,
  estadoInicial: {} as Record<number, string>,
  idsCreados: [] as number[],
  creados778: [] as number[],
  creados776: [] as number[],
  enviado1: false,
  enviado2: false,
  enviado13: false,
  rollbackHecho: false,
  rollbackPrincipalHttp: 0,
  t00: null as SnapshotInocuidad | null,
  t99: null as SnapshotInocuidad | null,
  runs: [] as { run_id: string; rollback_http: number }[],
  observaciones: [] as string[],
  retirados: [] as CheckpointRetirado[],
  correos_reales: [] as CorreoReal[],
};

// ── Fechas en la zona del caso ──────────────────────────────────────────
function zona(): string {
  return String(Cypress.env('ZONA_HORARIA'));
}
function hoyEnZona(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

// ── Utilidades de DOM sin aserciones ────────────────────────────────────
const RE = {
  menu: /^\s*(suministros|supplies)\s*$/i,
  pestana: /^\s*(medicamentos|medications)\s*$/i,
  titulo: /aplicaci[oó]n de medicamentos|medication log/i,
  registrar: /registrar aplicaci[oó]n|record application/i,
  guardar: /guardar registro|save record/i,
  exito: /aplicaci[oó]n registrada|application recorded/i,
  enRetiro: /en retiro hasta|withdrawal until/i,
  validado: /\b(validado|validated)\b/i,
  cantidad: /cantidad actual|individuos actuales|current (quantity|headcount|count)|current individuals/i,
  dosisInd: /dosis por individuo|dose per (individual|animal|head)/i,
};

function dialogo(doc: Document): HTMLElement | null {
  return doc.querySelector<HTMLElement>('[role="dialog"]');
}
function texto(el: Element | null | undefined): string {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}
function botonPorTexto(raiz: ParentNode, re: RegExp): HTMLButtonElement | undefined {
  return Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find((b) => re.test(texto(b)));
}
function erroresDeCampo(doc: Document): string[] {
  const d = dialogo(doc);
  return d ? Array.from(d.querySelectorAll('.ds-field__error')).map((e) => texto(e)) : ['(no hay diálogo abierto)'];
}
function filaRegistro(doc: Document, idActivo: number): HTMLTableRowElement | undefined {
  return Array.from(doc.querySelectorAll<HTMLTableRowElement>('table tbody tr')).find((tr) => {
    const t = texto(tr);
    return t.includes(`#${idActivo}`) && t.includes(MEDICAMENTO) && RE.enRetiro.test(t);
  });
}
/** CP-09: ¿hay en el diálogo un rótulo de cantidad actual con el valor 10 en solo lectura? */
function muestraCantidadActual(doc: Document): boolean {
  const d = dialogo(doc);
  if (!d || !RE.cantidad.test(texto(d))) return false;
  const soloLectura = Array.from(d.querySelectorAll<HTMLInputElement>('input[readonly], input[aria-readonly="true"], [aria-readonly="true"]'))
    .some((i) => String((i as HTMLInputElement).value ?? texto(i)).trim() === String(CANTIDAD_POB));
  const textoPlano = Array.from(d.querySelectorAll('output, dd, p, span, div'))
    .some((e) => e.children.length === 0 && RE.cantidad.test(texto(e.parentElement)) && new RegExp(`(^|\\D)${CANTIDAD_POB}(\\D|$)`).test(texto(e)));
  return soloLectura || textoPlano;
}
/** CP-10: ¿hay en el diálogo un rótulo de dosis por individuo con el valor 2,0? */
function muestraDosisPorIndividuo(doc: Document): boolean {
  const d = dialogo(doc);
  if (!d || !RE.dosisInd.test(texto(d))) return false;
  return Array.from(d.querySelectorAll('input, output, dd, p, span, div')).some((e) => {
    const valor = e instanceof HTMLInputElement ? e.value : e.children.length === 0 ? texto(e) : '';
    return /^\s*2([.,]0+)?(\s|$)/.test(valor) && RE.dosisInd.test(texto(e.closest('div, label, dl, fieldset') || e.parentElement));
  });
}

function num(v: unknown): number {
  return v === null || v === undefined || v === '' ? NaN : Number(v);
}
function estadoActivo(body: any): string {
  return String(body?.nombre_estado ?? body?.estado ?? '(sin estado)');
}
function exigirSandbox(): void {
  if (!ctx.sandboxOk) {
    throw new Error('[TC-M05-G13] El sandbox no quedó confirmado en CP-01: se detiene el bloque para no escribir fuera de él.');
  }
}

// ── Formulario (selectores estables #medicamento-*) ─────────────────────
interface DatosForm {
  activo: number;
  via: 'INTRAMUSCULAR' | 'ORAL';
  hora: string;
  dosis: number;
  retiro: number;
  costo: number;
  /** En el sub-caso 2 el activo y la dosis ya se escribieron para CP-09/CP-10. */
  omitirActivoYDosis?: boolean;
}

interface Apertura { habilitado: boolean; abierto: boolean }

function abrirFormulario(): Cypress.Chainable<Apertura> {
  return cy.document({ log: false }).then((doc): Cypress.Chainable<Apertura> => {
    const btn = botonPorTexto(doc, RE.registrar);
    const habilitado = !!btn && !btn.disabled;
    if (!habilitado) return cy.wrap<Apertura>({ habilitado, abierto: false }, { log: false });
    cy.contains('button', RE.registrar).click();
    return cy
      .esperarCondicion((d) => {
        const dlg = dialogo(d);
        return !!dlg && RE.registrar.test(dlg.getAttribute('aria-label') || texto(dlg));
      }, 15000)
      .then((abierto): Apertura => ({ habilitado, abierto }));
  });
}

function elegirActivo(id: number): void {
  cy.get('#medicamento-activo').clear().type(`#${id}`).blur();
}

function llenarFormulario(f: DatosForm): void {
  if (!f.omitirActivoYDosis) elegirActivo(f.activo);
  cy.get('#medicamento-nombre').clear().type(MEDICAMENTO);
  cy.get('#medicamento-via').select(f.via);
  cy.get('#medicamento-hora').clear().type(f.hora);
  if (!f.omitirActivoYDosis) cy.get('#medicamento-dosis').clear().type(String(f.dosis));
  cy.get('#medicamento-unidad').clear().type('ml');
  cy.get('#medicamento-costo').clear().type(String(f.costo));
  cy.get('#medicamento-retiro').clear().type(String(f.retiro));
  cy.get('#medicamento-vet').clear().type(VETERINARIO);
  cy.get('#medicamento-motivo').clear().type(MOTIVO).blur();
}

/** Evalúa la respuesta del POST (CP-05 / CP-11). */
function evaluarRegistro(
  inter: { request: { body: any }; response?: { statusCode: number; body: any; headers?: Record<string, any> } },
  idActivo: number,
  diasRetiro: number,
  costoEsperado: number,
  dosisIndEsperada: number | null,
): { ok: boolean; obtenido: string; id?: number; status: number; reqId: string } {
  const status = inter.response?.statusCode ?? 0;
  const reqId = extraerRequestId(inter.response?.headers);
  const med = inter.response?.body?.medicamento ?? {};
  const fechaEsperada = sumarDias(ctx.hoy, diasRetiro);
  const yaEnTratamiento = ctx.estadoInicial[idActivo] === 'EN_TRATAMIENTO';
  const statusOk = status === 201 || (status === 200 && yaEnTratamiento);
  const bodyLimpio = !Object.prototype.hasOwnProperty.call(inter.request.body ?? {}, 'dosis_por_individuo');
  const claveDosis = Object.prototype.hasOwnProperty.call(med, 'dosis_por_individuo');
  const dosisInd = med.dosis_por_individuo;
  const dosisOk = dosisIndEsperada === null ? claveDosis && dosisInd === null : num(dosisInd) === dosisIndEsperada;
  const textoDosis =
    dosisIndEsperada === null
      ? `dosis_por_individuo (clave presente: ${claveDosis ? 'sí' : 'no'}; valor: ${JSON.stringify(dosisInd)})`
      : `dosis_por_individuo=${JSON.stringify(dosisInd)}`;
  const checks: [string, boolean][] = [
    [`HTTP ${status}${status === 200 ? (yaEnTratamiento ? ' (activo ya EN_TRATAMIENTO)' : ' (inesperado: el activo no estaba EN_TRATAMIENTO)') : ''}`, statusOk],
    [`estado_registro=${med.estado_registro}`, med.estado_registro === 'VALIDADO'],
    [`fecha_fin_retiro=${med.fecha_fin_retiro} (esperada ${fechaEsperada})`, med.fecha_fin_retiro === fechaEsperada],
    [`costo_total_medicamento=${med.costo_total_medicamento}`, num(med.costo_total_medicamento) === costoEsperado],
    [textoDosis, dosisOk],
    [`body ${bodyLimpio ? 'sin' : 'CON'} dosis_por_individuo`, bodyLimpio],
  ];
  const ok = checks.every(([, c]) => c);
  const obtenido = `${checks.map(([t, c]) => `${c ? '' : '✗ '}${t}`).join('; ')} | X-Request-Id=${reqId}`;
  return { ok, obtenido, id: typeof med.id_registro_medicamento === 'number' ? med.id_registro_medicamento : undefined, status, reqId };
}

function interceptarPost(alias: string): void {
  cy.intercept({ method: 'POST', url: new RegExp(`/suministros/medicamentos$`) }).as(alias);
}

function cuerpoPostDirecto(): Record<string, unknown> {
  return {
    id_activo_biologico: ACTIVO_POB,
    nombre_medicamento: MEDICAMENTO,
    fecha_aplicacion: ctx.hoy,
    hora_aplicacion: '08:30',
    via_administracion: 'ORAL',
    dosis_aplicada: String(DOSIS_POB),
    unidad_dosis: 'ml',
    periodo_retiro_dias: 3,
    motivo_aplicacion: MOTIVO,
    costo_unitario: '200',
    nombre_veterinario: VETERINARIO,
    dosis_por_individuo: 999,
  };
}

function analizarListadoMed(res: Cypress.Response<any>): SnapshotListado {
  const total = typeof res.body?.total === 'number' ? res.body.total : -1;
  const items: any[] = Array.isArray(res.body?.items) ? res.body.items : [];
  const ids = items.map((m) => Number(m.id_registro_medicamento)).filter((n) => Number.isFinite(n));
  const completo = res.status === 200 && total >= 0 && items.length === total;
  const idMax = total === 0 ? null : ids.length ? Math.max(...ids) : null;
  return {
    http: res.status,
    completo,
    total,
    items_count: items.length,
    id_maximo: idMax,
    ids,
    x_request_id: extraerRequestId(res.headers as Record<string, any>),
  };
}

/** Corrida de sandbox propia de solo lectura (T00 / T99) con login por API y cierre DELETE 2xx. */
function ejecutarSnapshotInocuidad(fase: 'T00' | 'T99', runId: string): Cypress.Chainable<SnapshotInocuidad> {
  const base = String(Cypress.env('API_BASE_URL') || '').replace(/\/+$/, '');
  const sec = String(Cypress.env('TEST_SANDBOX_SECRET') || '');
  const z = zona();
  const email = String(Cypress.env('VET_EMAIL') || '');
  const pass = String(Cypress.env('VET_PASSWORD') || '');

  const reqApi = (paso: string, method: 'GET' | 'POST' | 'DELETE', path: string, token?: string, body?: any) =>
    cy
      .request({
        method,
        url: `${base}${path}`,
        body,
        headers: {
          'X-Test-Run-Id': runId,
          'X-Sandbox-Secret': sec,
          'X-Zona-Horaria': z,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        failOnStatusCode: false,
        log: false,
      })
      .then((res) => {
        registrarTraza({
          paso,
          metodo: method,
          ruta: path,
          http: res.status,
          error_code: res.body?.error_code ?? null,
          x_request_id: extraerRequestId(res.headers as Record<string, any>),
        });
        return cy.wrap(res, { log: false });
      });

  return reqApi(`${fase}-login`, 'POST', '/sesiones/', undefined, { correo_electronico: email, contrasena: pass }).then((resLogin) => {
    if (resLogin.status !== 200 || !resLogin.body?.token) {
      return reqApi(`${fase}-rollback-fallo-login`, 'DELETE', `/test-control/runs/${encodeURIComponent(runId)}`).then((rb) => {
        ctx.runs.push({ run_id: runId, rollback_http: rb.status });
        throw new Error(`[${TC}] ${fase}: login API falló (HTTP ${resLogin.status}). Abortado sin reintentar.`);
      });
    }
    const token = String(resLogin.body.token);
    return reqApi(`${fase}-activo-778`, 'GET', `/activos-biologicos/${ACTIVO_IND}`, token).then((a778) =>
      reqApi(`${fase}-activo-776`, 'GET', `/activos-biologicos/${ACTIVO_POB}`, token).then((a776) =>
        reqApi(`${fase}-meds-778`, 'GET', `/suministros/medicamentos?id_activo_biologico=${ACTIVO_IND}`, token).then((m778) =>
          reqApi(`${fase}-meds-776`, 'GET', `/suministros/medicamentos?id_activo_biologico=${ACTIVO_POB}`, token).then((m776) =>
            reqApi(`${fase}-auditoria`, 'GET', '/suministros/auditoria', token).then((aud) =>
              reqApi(`${fase}-rollback`, 'DELETE', `/test-control/runs/${encodeURIComponent(runId)}`).then((rb) => {
                ctx.runs.push({ run_id: runId, rollback_http: rb.status });
                if (rb.status < 200 || rb.status >= 300) {
                  throw new Error(`[${TC}] ${fase}: rollback DELETE respondió HTTP ${rb.status} (esperado 2xx).`);
                }
                const snap: SnapshotInocuidad = {
                  run_id: runId,
                  rollback_http: rb.status,
                  activos: {
                    [ACTIVO_IND]: {
                      http: a778.status,
                      estado: a778.status === 200 ? estadoActivo(a778.body) : `HTTP ${a778.status}`,
                      x_request_id: extraerRequestId(a778.headers as Record<string, any>),
                    },
                    [ACTIVO_POB]: {
                      http: a776.status,
                      estado: a776.status === 200 ? estadoActivo(a776.body) : `HTTP ${a776.status}`,
                      x_request_id: extraerRequestId(a776.headers as Record<string, any>),
                    },
                  },
                  medicamentos: {
                    [ACTIVO_IND]: analizarListadoMed(m778),
                    [ACTIVO_POB]: analizarListadoMed(m776),
                  },
                  auditoria: (() => {
                    const reqId = extraerRequestId(aud.headers as Record<string, any>);
                    if (aud.status !== 200) return { http: aud.status, x_request_id: reqId };
                    const items: any[] = Array.isArray(aud.body?.items) ? aud.body.items : [];
                    const total = typeof aud.body?.total === 'number' ? aud.body.total : items.length;
                    const ids = items.map((x) => Number(x.id_auditoria_suministro ?? x.id ?? 0)).filter((n) => n > 0);
                    return { http: aud.status, total, id_maximo: ids.length ? Math.max(...ids) : null, x_request_id: reqId };
                  })(),
                };
                return cy.wrap(snap, { log: false });
              }),
            ),
          ),
        ),
      ),
    );
  });
}

// =====================================================================
describe(`${TC} · RF-76 · Registro de aplicación de medicamento según modalidad`, () => {
  before(() => {
    const requeridas = ['API_BASE_URL', 'VET_EMAIL', 'VET_PASSWORD', 'TEST_SANDBOX_SECRET', 'ZONA_HORARIA', 'STAGING_DIR', 'REINTENTO'];
    const faltan = requeridas.filter((k) => !String(Cypress.env(k) || '').trim());
    if (faltan.length) {
      throw new Error(`[${TC}] Faltan variables de entorno: ${faltan.join(', ')}. Se aborta antes del login.`);
    }
    ctx.stagingDir = String(Cypress.env('STAGING_DIR')).trim();
    ctx.reintento = Number(Cypress.env('REINTENTO'));
    if (!Number.isInteger(ctx.reintento) || ctx.reintento < 1) {
      throw new Error(`[${TC}] REINTENTO inválido: ${Cypress.env('REINTENTO')}`);
    }

    // C2: Guardas estrictas de no reintento y staging
    const retriesCfg = Cypress.config('retries');
    const runModeRetries = typeof retriesCfg === 'object' && retriesCfg !== null ? retriesCfg.runMode : retriesCfg;
    if (runModeRetries !== 0) {
      throw new Error(`[${TC}] retries debe ser 0 para la corrida oficial. Configurado: ${JSON.stringify(retriesCfg)}`);
    }

    const screenshotsFolder = (Cypress.config('screenshotsFolder') || '').replace(/\\/g, '/').toLowerCase();
    const stagingDirNormalizado = ctx.stagingDir.replace(/\\/g, '/').toLowerCase();
    if (!screenshotsFolder || !stagingDirNormalizado || !screenshotsFolder.startsWith(stagingDirNormalizado)) {
      throw new Error(`[${TC}] screenshotsFolder no apunta al staging actual. screenshotsFolder=${screenshotsFolder}, stagingDir=${stagingDirNormalizado}`);
    }

    ctx.hoy = hoyEnZona();
    cy.fijarZonaHoraria(zona());
    // T00: línea base en sandbox propio cerrado ANTES de iniciar la corrida principal.
    const t00RunId = `tc-m05-g13-t00-${Date.now()}`;
    ejecutarSnapshotInocuidad('T00', t00RunId).then((snap) => {
      ctx.t00 = snap;
      if (snap.auditoria?.http === 200) {
        ctx.observaciones.push(`T00 auditoría HTTP 200: total=${snap.auditoria.total}, id_maximo=${snap.auditoria.id_maximo}`);
      } else {
        ctx.observaciones.push(`T00 auditoría HTTP ${snap.auditoria?.http ?? 'N/A'}`);
      }
      // C1: Limpieza exhaustiva del navegador tras T00
      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      cy.clearAllSessionStorage();
      cy.getAllCookies().then((cookies) => {
        if (cookies.length > 0) {
          throw new Error('[TC-M05-G13] quedan ' + cookies.length + ' cookies tras limpiar: ' + cookies.map((c) => c.name).join(', '));
        }
      });
      ctx.observaciones.push('Navegador limpiado tras T00: cookies restantes 0');
      cy.startSandbox(RUN_ID); // antes de cualquier login principal: el token nace dentro del sandbox
    });
  });

  // Cypress borra los intercepts antes de cada it(): se vuelve a aplicar el del sandbox.
  beforeEach(() => {
    cy.aplicarSandbox();
  });

  // ── Sub-caso 1 · INDIVIDUAL ───────────────────────────────────────────
  it('CP-01..CP-03 · login del Veterinario dentro del sandbox y apertura del formulario', { retries: 0 }, () => {
    // C6: Espías de autenticación y permisos
    cy.intercept({ method: 'GET', url: /\/sesiones\/me\/permisos(\?|$)/ }).as('permisos');
    cy.intercept({ method: 'POST', url: /\/sesiones\/refresh(\?|$)/ }).as('refresh');

    cy.loginUI(String(Cypress.env('VET_EMAIL')), String(Cypress.env('VET_PASSWORD'))).then((salioDeLogin) => {
      ctx.loginOk = salioDeLogin;
      cy.esperarToken('sandbox', 30000);
      cy.location('pathname', { log: false }).then((rutaRaw) => {
        const ruta = rutaApp(rutaRaw);
        cy.estadoSandbox().then((s: ResumenSandbox) => {
          ctx.sandboxOk = s.confirmado && s.hayTokenSandbox;
          if (ruta === '/login' || !salioDeLogin) {
            cy.screenshot('CP-01_login_fallido', { capture: 'viewport' });
            cy.document({ log: false }).then((doc) => {
              const alertas = Array.from(doc.querySelectorAll('[role="alert"], .ds-field__error'))
                .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
                .filter((t) => t.length > 0)
                .join(' | ')
                .slice(0, 200);

              const infoSesiones = s.sesiones && s.sesiones.length > 0
                ? s.sesiones.map((req) => `${req.method} ${req.url} -> HTTP ${req.statusCode ?? 'sin respuesta'}`).join('; ')
                : '(ninguna petición a /sesiones interceptada)';

              let detalle = `ruta ${rutaRaw}; login fallido; alertas: ${alertas ? `«${alertas}»` : 'ninguna'}; peticiones /sesiones: ${infoSesiones}; sandbox confirmado: ${s.confirmado ? 'sí' : 'no'}; token capturado: ${s.hayTokenSandbox ? 'sí' : 'no'}; peticiones con sandbox: ${s.peticiones}`;
              if (s.bloqueadasCount > 0) {
                detalle += `; bloqueadas por fail-closed: ${s.bloqueadasCount} (hosts: ${s.hostsBloqueados.join(', ')})`;
              }
              registrar('CP-01', false, detalle);
              exigirSandbox();
            });
          } else {
            let obtenido = `ruta ${rutaRaw}; sandbox confirmado por el backend: ${s.confirmado ? 'sí' : 'no'}; token capturado: ${s.hayTokenSandbox ? 'sí' : 'no'}; peticiones con sandbox: ${s.peticiones}`;
            if (!ctx.sandboxOk && s.peticiones === 0) {
              const detalleBloqueo = s.bloqueadasCount > 0
                ? `; peticiones bloqueadas: ${s.bloqueadasCount} (hosts: ${s.hostsBloqueados.join(', ')})`
                : '; peticiones bloqueadas: 0';
              obtenido += detalleBloqueo;
            }
            registrar(
              'CP-01',
              salioDeLogin && ctx.sandboxOk,
              obtenido,
            );
            exigirSandbox();
          }
        });
      });
    });

    // Estado inicial de los dos activos (para 201/200 y para CP-14).
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_IND}` }).then((r) => {
      ctx.estadoInicial[ACTIVO_IND] = r.status === 200 ? estadoActivo(r.body) : `HTTP ${r.status}`;
    });
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_POB}` }).then((r) => {
      ctx.estadoInicial[ACTIVO_POB] = r.status === 200 ? estadoActivo(r.body) : `HTTP ${r.status}`;
    });

    // CP-02 · menú lateral → pestaña Medicamentos (sin recargar: el JWT vive en memoria)
    cy.esperarCondicion((doc) => Array.from(doc.querySelectorAll('.ds-sidebar__item')).some((e) => RE.menu.test(texto(e))), 30000).then((hayMenu) => {
      if (hayMenu) {
        cy.contains('.ds-sidebar__item', RE.menu).click();
      } else {
        cy.window({ log: false }).then((w) => {
          w.history.pushState({}, '', `${appBasePath()}/suministros`);
          w.dispatchEvent(new PopStateEvent('popstate'));
        });
      }
      cy.esperarCondicion((doc) => Array.from(doc.querySelectorAll('.ds-subpestanas__item')).some((e) => RE.pestana.test(texto(e))), 30000).then((hayPestana) => {
        if (hayPestana) cy.contains('.ds-subpestanas__item', RE.pestana).click();
        cy.esperarCondicion((doc) => rutaApp(doc.location.pathname) === '/suministros/medicamentos' && RE.titulo.test(texto(doc.querySelector('h1'))), 30000).then((ok) => {
          cy.location('pathname', { log: false }).then((rutaRaw) => {
            const ruta = rutaApp(rutaRaw);
            registrar('CP-02', ok && hayMenu && hayPestana, `ruta ${rutaRaw}; menú Suministros: ${hayMenu ? 'sí' : 'no'}; pestaña Medicamentos: ${hayPestana ? 'sí' : 'no'}; título visible: ${ok ? 'sí' : 'no'} | captura=CP-02_navegacion`);
            cy.screenshot('CP-02_navegacion');

            // C6: Registrar trazas de autenticación / permisos tras CP-02
            cy.get('@permisos.all').then((interPermisos: any[]) => {
              cy.get('@refresh.all').then((interRefresh: any[]) => {
                const listPermisosHttp: (number | string)[] = [];
                const listPermisosReqId: string[] = [];
                for (const p of interPermisos) {
                  const st = p.response?.statusCode ?? 'sin respuesta';
                  listPermisosHttp.push(st);
                  listPermisosReqId.push(extraerRequestId(p.response?.headers) || '(sin id)');
                  registrarTraza({
                    paso: 'CP-01/CP-02-permisos',
                    metodo: 'GET',
                    ruta: '/sesiones/me/permisos',
                    http: typeof st === 'number' ? st : 0,
                    error_code: p.response?.body?.error_code ?? null,
                    x_request_id: extraerRequestId(p.response?.headers),
                  });
                }
                const listRefreshHttp: (number | string)[] = [];
                for (const r of interRefresh) {
                  const st = r.response?.statusCode ?? 'sin respuesta';
                  listRefreshHttp.push(st);
                  registrarTraza({
                    paso: 'CP-01/CP-02-refresh',
                    metodo: 'POST',
                    ruta: '/sesiones/refresh',
                    http: typeof st === 'number' ? st : 0,
                    error_code: r.response?.body?.error_code ?? null,
                    x_request_id: extraerRequestId(r.response?.headers),
                  });
                }
                const strPermisos = listPermisosHttp.length ? listPermisosHttp.join(', ') : 'ninguno';
                const strRefresh = listRefreshHttp.length ? listRefreshHttp.join(', ') : 'ninguno';
                ctx.observaciones.push(`auth: permisos HTTP ${strPermisos}; refresh HTTP ${strRefresh}`);

                const hayNo200 = interPermisos.length === 0 || interPermisos.some((p) => p.response?.statusCode !== 200);
                if (hayNo200) {
                  const strReqId = listPermisosReqId.length ? listPermisosReqId.join(', ') : 'ninguno';
                  ctx.ambienteInvalido = `permisos HTTP ${strPermisos} X-Request-Id ${strReqId}`;
                }
              });
            });
          });
        });
      });
    });

    // CP-03 · botón habilitado y diálogo
    abrirFormulario().then(({ habilitado, abierto }) => {
      registrar('CP-03', habilitado && abierto, `botón habilitado: ${habilitado ? 'sí' : 'no'}; diálogo abierto: ${abierto ? 'sí' : 'no'} | captura=CP-03_formulario`);
      cy.screenshot('CP-03_formulario');
    });
  });

  it('CP-04..CP-06 · registro INDIVIDUAL (activo 778) desde la UI', () => {
    exigirSandbox();
    const fechaFin = sumarDias(ctx.hoy, 7);

    const verificarUI = () => {
      cy.esperarCondicion((doc) => Array.from(doc.querySelectorAll('.ds-toasts [role="alert"]')).some((a) => RE.exito.test(texto(a))), 15000).then((hayToast) => {
        cy.document({ log: false }).then((doc) => {
          const toast = Array.from(doc.querySelectorAll('.ds-toasts [role="alert"]')).map(texto).find((t) => RE.exito.test(t)) || '';
          const toastConFecha = toast.includes(fechaFin);
          cy.esperarCondicion((d) => !!filaRegistro(d, ACTIVO_IND), 30000).then((hayFila) => {
            cy.document({ log: false }).then((d2) => {
              const fila = filaRegistro(d2, ACTIVO_IND);
              const validado = !!fila && RE.validado.test(texto(fila));
              ctx.observaciones.push(`CP-06 lista: fila En retiro: ${hayFila ? 'sí' : 'no'}; estado Validado: ${validado ? 'sí' : 'no'}`);
              registrar(
                'CP-06',
                hayToast && toastConFecha,
                toast,
              );
              cy.screenshot('cp06-registro-individual', { capture: 'viewport' });
            });
          });
        });
      });
    };

    // Reintento (retries: 1): el POST ya salió en el intento anterior; no se duplica.
    if (ctx.enviado1) {
      verificarUI();
      return;
    }

    cy.document({ log: false }).then((doc) => {
      if (!dialogo(doc)) abrirFormulario();
    });

    // CP-04
    cy.get('#medicamento-fecha').invoke('val').then((fechaDefecto) => {
      llenarFormulario({ activo: ACTIVO_IND, via: 'INTRAMUSCULAR', hora: '08:00', dosis: 10, retiro: 7, costo: 500 });
      cy.get('#medicamento-hora').invoke('val').then((hora) => {
        cy.document({ log: false }).then((doc) => {
          const errores = erroresDeCampo(doc);
          const fechaOk = String(fechaDefecto) === ctx.hoy;
          registrar(
            'CP-04',
            errores.length === 0 && fechaOk && hora === '08:00',
            `fecha por defecto ${fechaDefecto} (hoy ${ctx.hoy}); hora ${hora}; errores de campo: ${errores.length ? errores.join(' | ') : 'ninguno'}`,
          );
        });
      });
    });

    // CP-05
    interceptarPost('postInd');
    cy.contains('[role="dialog"] button', RE.guardar).click();
    cy.wait('@postInd', { timeout: 60000 }).then((inter) => {
      ctx.enviado1 = true;
      const r = evaluarRegistro(inter, ACTIVO_IND, 7, 5000, null);
      registrarTraza({
        paso: 'CP-05',
        metodo: 'POST',
        ruta: '/suministros/medicamentos',
        http: r.status,
        error_code: inter.response?.body?.error_code ?? null,
        x_request_id: r.reqId,
        cuerpo: sanitizarCuerpoMed(inter.response?.body),
      });
      if (r.status >= 200 && r.status < 300) {
        ctx.correos_reales.push({ paso: 'CP-05', activo: ACTIVO_IND, id_registro_medicamento: r.id ?? null, periodo_retiro_dias: 7, hora_utc: new Date().toISOString(), http: r.status });
      }
      if (r.id) {
        ctx.idsCreados.push(r.id);
        ctx.creados778.push(r.id);
      }
      registrar('CP-05', r.ok, r.obtenido);
    });

    // CP-06
    verificarUI();
  });

  it('CP-07 · el activo 778 queda EN_TRATAMIENTO (RF-44)', () => {
    exigirSandbox();
    const cp05 = resultados.get('CP-05');
    const cp05Ok = cp05?.estado === 'OK';
    if (!ctx.enviado1 || !cp05Ok) {
      cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_IND}` }).then((r) => {
        const est = estadoActivo(r.body);
        const reqId = extraerRequestId(r.headers as Record<string, any>);
        registrar('CP-07', false, `No alcanzado: CP-05 no registró la aplicación (${cp05?.obtenido ?? 'no enviado'}); estado actual ${est} | X-Request-Id=${reqId}`);
      });
      return;
    }
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_IND}` }).then((r) => {
      const est = estadoActivo(r.body);
      const reqId = extraerRequestId(r.headers as Record<string, any>);
      registrar('CP-07', r.status === 200 && est === 'EN_TRATAMIENTO', `HTTP ${r.status}; estado ${est} (inicial ${ctx.estadoInicial[ACTIVO_IND]}) | X-Request-Id=${reqId}`);
    });
  });

  // ── Sub-caso 2 · POBLACIONAL ──────────────────────────────────────────
  it('CP-08 · precondición del activo poblacional 776', () => {
    exigirSandbox();
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_POB}` }).then((r) => {
      const a = r.body ?? {};
      const cantidad = num(a.detalle_poblacional?.cantidad_actual);
      const est = estadoActivo(a);
      registrar(
        'CP-08',
        r.status === 200 && est === 'ACTIVO' && a.tipo === 'POBLACIONAL' && cantidad === CANTIDAD_POB,
        `HTTP ${r.status}; tipo ${a.tipo}; estado ${est}; cantidad_actual ${a.detalle_poblacional?.cantidad_actual}`,
      );
    });
  });

  it('CP-09..CP-11 · registro POBLACIONAL (activo 776) desde la UI', () => {
    exigirSandbox();
    if (ctx.enviado2) return; // reintento: el POST ya salió, no se duplica

    cy.document({ log: false }).then((doc) => {
      if (!dialogo(doc)) abrirFormulario();
    });

    // CP-09 · cantidad actual en solo lectura (DEFECTO CONOCIDO: hoy no existe)
    elegirActivo(ACTIVO_POB);
    cy.esperarCondicion(muestraCantidadActual, 8000).then((ok) => {
      registrar('CP-09', ok, (ok ? `se muestra la cantidad actual ${CANTIDAD_POB} en solo lectura` : 'el formulario no muestra la cantidad actual del activo poblacional') + ' | captura=CP-09_cantidad_776');
      cy.screenshot('CP-09_cantidad_776');
    });

    // CP-10 · dosis por individuo en vivo (DEFECTO CONOCIDO: hoy no existe)
    cy.get('#medicamento-dosis').clear().type(String(DOSIS_POB));
    cy.esperarCondicion(muestraDosisPorIndividuo, 8000).then((ok) => {
      registrar('CP-10', ok, (ok ? 'se muestra la dosis por individuo 2,0 en vivo' : `el formulario no muestra la dosis por individuo al escribir ${DOSIS_POB}`) + ' | captura=CP-10_dosis_776');
      cy.screenshot('CP-10_dosis_776');
    });

    // CP-11 · se evalúa aunque CP-09/CP-10 fallen
    llenarFormulario({ activo: ACTIVO_POB, via: 'ORAL', hora: '08:00', dosis: DOSIS_POB, retiro: 3, costo: 200, omitirActivoYDosis: true });
    interceptarPost('postPob');
    cy.contains('[role="dialog"] button', RE.guardar).click();
    cy.wait('@postPob', { timeout: 60000 }).then((inter) => {
      ctx.enviado2 = true;
      const r = evaluarRegistro(inter, ACTIVO_POB, 3, 4000, 2);
      registrarTraza({
        paso: 'CP-11',
        metodo: 'POST',
        ruta: '/suministros/medicamentos',
        http: r.status,
        error_code: inter.response?.body?.error_code ?? null,
        x_request_id: r.reqId,
        cuerpo: sanitizarCuerpoMed(inter.response?.body),
      });
      if (r.status >= 200 && r.status < 300) {
        ctx.correos_reales.push({ paso: 'CP-11', activo: ACTIVO_POB, id_registro_medicamento: r.id ?? null, periodo_retiro_dias: 3, hora_utc: new Date().toISOString(), http: r.status });
      }
      if (r.id) {
        ctx.idsCreados.push(r.id);
        ctx.creados776.push(r.id);
      }
      registrar('CP-11', r.ok, r.obtenido);
    });
  });

  it('CP-12 · el activo 776 queda EN_TRATAMIENTO (RF-44)', () => {
    exigirSandbox();
    const cp11 = resultados.get('CP-11');
    const cp11Ok = cp11?.estado === 'OK';
    if (!ctx.enviado2 || !cp11Ok) {
      cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_POB}` }).then((r) => {
        const est = estadoActivo(r.body);
        const reqId = extraerRequestId(r.headers as Record<string, any>);
        registrar('CP-12', false, `No alcanzado: CP-11 no registró la aplicación (${cp11?.obtenido ?? 'no enviado'}); estado actual ${est} | X-Request-Id=${reqId}`);
      });
      return;
    }
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_POB}` }).then((r) => {
      const est = estadoActivo(r.body);
      const reqId = extraerRequestId(r.headers as Record<string, any>);
      registrar('CP-12', r.status === 200 && est === 'EN_TRATAMIENTO', `HTTP ${r.status}; estado ${est} (inicial ${ctx.estadoInicial[ACTIVO_POB]}) | X-Request-Id=${reqId}`);
    });
  });

  it('CP-13 · dosis_por_individuo enviada en el body no se acepta como entrada', () => {
    exigirSandbox();
    if (ctx.enviado13) return; // reintento: no se repite la escritura
    cy.apiSandbox({ method: 'POST', path: '/suministros/medicamentos', body: cuerpoPostDirecto() }).then((r) => {
      ctx.enviado13 = true;
      const reqIdPost = extraerRequestId(r.headers as Record<string, any>);
      const med = r.body?.medicamento ?? {};
      if (r.status >= 400 && r.status < 500) {
        registrar('CP-13', true, `HTTP ${r.status} (${r.body?.error_code ?? 'rechazado'}): el campo no se acepta | X-Request-Id=${reqIdPost}`);
        return;
      }
      if (r.status < 200 || r.status >= 300) {
        registrar('CP-13', false, `HTTP ${r.status} inesperado | X-Request-Id=${reqIdPost}`);
        return;
      }
      const id = med.id_registro_medicamento as number | undefined;
      ctx.correos_reales.push({ paso: 'CP-13', activo: ACTIVO_POB, id_registro_medicamento: typeof id === 'number' ? id : null, periodo_retiro_dias: 3, hora_utc: new Date().toISOString(), http: r.status });
      if (typeof id === 'number') {
        ctx.idsCreados.push(id);
        ctx.creados776.push(id);
      }
      // Se confirma también lo que quedó guardado, no solo lo que respondió el POST.
      cy.apiSandbox({ method: 'GET', path: `/suministros/medicamentos?id_activo_biologico=${ACTIVO_POB}` }).then((lista) => {
        const guardado = (lista.body?.items ?? []).find((m: any) => m.id_registro_medicamento === id);
        const respOk = num(med.dosis_por_individuo) === 2;
        const guardadoOk = !!guardado && num(guardado.dosis_por_individuo) === 2;
        registrar(
          'CP-13',
          respOk && guardadoOk,
          `HTTP ${r.status}; respuesta dosis_por_individuo=${JSON.stringify(med.dosis_por_individuo)}; guardado=${guardado ? JSON.stringify(guardado.dosis_por_individuo) : '(no encontrado en el listado)'} | X-Request-Id=${reqIdPost}`,
        );
      });
    });
  });

  // ── Cierre ────────────────────────────────────────────────────────────
  it('CP-14 · rollback del sandbox y verificación fuera de él', () => {
    cy.window().then((w) => {
      w.stop();
      w.location.href = 'about:blank';
    });
    cy.location('href', { timeout: 30000 }).should('eq', 'about:blank');

    cy.rollbackSandbox(RUN_ID).then((res) => {
      ctx.rollbackHecho = true;
      ctx.rollbackPrincipalHttp = res.status;
      ctx.runs.push({ run_id: RUN_ID, rollback_http: res.status });
      const rollbackOk = res.status >= 200 && res.status < 300;

      const t99RunId = `tc-m05-g13-t99-${Date.now()}`;
      ejecutarSnapshotInocuidad('T99', t99RunId).then((t99) => {
        ctx.t99 = t99;
        const t00 = ctx.t00;
        if (!t00) {
          registrar('CP-14', false, `rollback HTTP ${res.status}; T00 no disponible para comparar`);
          return;
        }

        const est778_t00 = t00.activos[ACTIVO_IND]?.estado;
        const est778_t99 = t99.activos[ACTIVO_IND]?.estado;
        const est776_t00 = t00.activos[ACTIVO_POB]?.estado;
        const est776_t99 = t99.activos[ACTIVO_POB]?.estado;
        const estadosOk = est778_t99 === est778_t00 && est776_t99 === est776_t00;

        const med778_t00 = t00.medicamentos[ACTIVO_IND];
        const med778_t99 = t99.medicamentos[ACTIVO_IND];
        const med776_t00 = t00.medicamentos[ACTIVO_POB];
        const med776_t99 = t99.medicamentos[ACTIVO_POB];

        const list778Ok =
          med778_t00.completo &&
          med778_t99.completo &&
          med778_t99.total === med778_t00.total &&
          med778_t99.id_maximo === med778_t00.id_maximo;

        const list776Ok =
          med776_t00.completo &&
          med776_t99.completo &&
          med776_t99.total === med776_t00.total &&
          med776_t99.id_maximo === med776_t00.id_maximo;

        const idsCreados = ctx.idsCreados;
        const hayCreados = idsCreados.length > 0;

        const set778 = new Set(med778_t99.ids);
        const set776 = new Set(med776_t99.ids);

        const detallePresencia: string[] = [];
        let ausenciaOk = true;

        for (const id of ctx.creados778) {
          const presente = set778.has(id);
          detallePresencia.push(`id 778 #${id} presente: ${presente ? 'SÍ' : 'NO'}`);
          if (presente) ausenciaOk = false;
        }
        for (const id of ctx.creados776) {
          const presente = set776.has(id);
          detallePresencia.push(`id 776 #${id} presente: ${presente ? 'SÍ' : 'NO'}`);
          if (presente) ausenciaOk = false;
        }

        const cpOk = rollbackOk && estadosOk && list778Ok && list776Ok && hayCreados && ausenciaOk;

        let obtenido =
          `rollback HTTP ${res.status}; ` +
          `778 estado T00=${est778_t00}/T99=${est778_t99} (reqId=${t99.activos[ACTIVO_IND]?.x_request_id}); ` +
          `776 estado T00=${est776_t00}/T99=${est776_t99} (reqId=${t99.activos[ACTIVO_POB]?.x_request_id}); ` +
          `778 meds T00(tot=${med778_t00.total},max=${med778_t00.id_maximo})/T99(tot=${med778_t99.total},max=${med778_t99.id_maximo},reqId=${med778_t99.x_request_id}); ` +
          `776 meds T00(tot=${med776_t00.total},max=${med776_t00.id_maximo})/T99(tot=${med776_t99.total},max=${med776_t99.id_maximo},reqId=${med776_t99.x_request_id}); `;

        if (!hayCreados) {
          obtenido += 'no hubo ids creados que verificar (la corrida principal no creó registros con 2xx)';
        } else {
          obtenido += `ids creados (${idsCreados.join(', ')}): ${detallePresencia.join('; ')}`;
        }

        registrar('CP-14', cpOk, obtenido);
      });
    });
  });

  it('Veredicto · la corrida falla si hay al menos un checkpoint en FALLA', () => {
    const fallas = ORDEN.filter((id) => resultados.get(id)?.estado === 'FALLA');
    expect(fallas, `Checkpoints en FALLA: ${fallas.join(', ') || 'ninguno'}`).to.have.length(0);
  });

  after(() => {
    // Red de seguridad: si la corrida se cortó antes de CP-14, el rollback se hace aquí.
    if (!ctx.rollbackHecho) {
      cy.rollbackSandbox(RUN_ID).then((res) => {
        ctx.rollbackHecho = true;
        ctx.rollbackPrincipalHttp = res.status;
        ctx.runs.push({ run_id: RUN_ID, rollback_http: res.status });
        const cp = resultados.get('CP-14');
        if (cp && cp.estado === 'FALLA' && cp.obtenido.startsWith('No alcanzado')) {
          registrar('CP-14', false, `No alcanzado; rollback de respaldo en after() → HTTP ${res.status}`);
        }
      });
    }
    cy.wrap(null, { log: false }).then(() => {
      if (!ctx.stagingDir || !ctx.reintento) return;
      const cps = ORDEN.map((id) => resultados.get(id) as Checkpoint);
      const total = cps.length;
      const ok = cps.filter((c) => c.estado === 'OK').length;
      const falla = cps.filter((c) => c.estado === 'FALLA').length;
      const veredicto = falla === 0 && ok > 0 ? 'Aprobado' : 'Rechazado';

      if (ctx.ambienteInvalido) {
        ctx.observaciones.push(`Corrida inválida por ambiente: ${ctx.ambienteInvalido}`);
      }

      const reporte = {
        tc: TC,
        reintento: ctx.reintento,
        summary: { total, ok, falla, veredicto },
        checkpoints: cps,
        observaciones: ctx.observaciones,
        retirados: ctx.retirados,
        correos_reales: ctx.correos_reales,
        inocuidad: { t00: ctx.t00, t99: ctx.t99 },
        runs: ctx.runs,
      };

      if (!ctx.sandboxOk || ctx.ambienteInvalido) {
        const ahora = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const stamp = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
        const rutaInvalida = `${ctx.stagingDir}/run_INVALIDA_${stamp}.json`;
        cy.task('writeResult', { file: rutaInvalida, content: JSON.stringify(reporte, null, 2) });
        console.log(`\n[TC-M05-G13] Corrida INVÁLIDA por ambiente (${ctx.ambienteInvalido || 'sandbox no confirmado'}). Reporte guardado en ${rutaInvalida} (NO se escribió en resultados/).\n`);
      } else {
        const rutaOficial = `${ctx.stagingDir}/resultado_TC-M05-G13_reintento${ctx.reintento}.json`;
        cy.task('writeResult', { file: rutaOficial, content: JSON.stringify(reporte, null, 2) });
      }
    });
  });
});
