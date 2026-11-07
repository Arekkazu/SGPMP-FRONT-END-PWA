/// <reference types="cypress" />
// | Fecha      | Nombre                    | Que se hizo                                                          |
// |------------|---------------------------|----------------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: registro de medicamento INDIVIDUAL y POBLACIONAL    |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: diagnostico CP-01 y reporte condicional de sandbox |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: diagnostico de login CP-01 y retries 0          |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: soporte APP_BASE_PATH en rutas de CP-01 y CP-02 |
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
import { type ResumenSandbox, rutaApp, appBasePath } from './commands';

type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; esperado: string; obtenido: string; estado: Estado }
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
const ARCHIVO_RESULTADO = `resultados/resultado_${TC}.json`;

const ESPERADOS: Record<IdCp, { paso: string; esperado: string }> = {
  'CP-01': { paso: 'CP-01 Sandbox + login Veterinario', esperado: 'Sandbox aceptado por el backend antes del login y ruta distinta de /login' },
  'CP-02': { paso: 'CP-02 Navegación Suministros → Medicamentos', esperado: 'Ruta /suministros/medicamentos y título «Aplicación de medicamentos» visible' },
  'CP-03': { paso: 'CP-03 Abrir formulario de registro', esperado: 'Botón «Registrar aplicación» habilitado; se abre role=dialog' },
  'CP-04': { paso: 'CP-04 Llenar formulario INDIVIDUAL (activo 778)', esperado: 'Campos diligenciados, fecha por defecto = hoy (Bogotá), hora 08:00 y sin errores de campo' },
  'CP-05': { paso: 'CP-05 Guardar INDIVIDUAL → respuesta API', esperado: '201 (200 solo si ya estaba EN_TRATAMIENTO); VALIDADO; fecha_fin_retiro = hoy+7; costo_total_medicamento = 5000; dosis_por_individuo = null; body sin dosis_por_individuo' },
  'CP-06': { paso: 'CP-06 UI tras registrar INDIVIDUAL', esperado: 'Toast de éxito con la fecha de fin de retiro; fila con «En retiro hasta…» y estado Validado' },
  'CP-07': { paso: 'CP-07 Estado del activo 778 (RF-44)', esperado: 'GET /activos-biologicos/778 → EN_TRATAMIENTO' },
  'CP-08': { paso: 'CP-08 Precondición activo 776', esperado: 'GET /activos-biologicos/776 → ACTIVO, POBLACIONAL, cantidad_actual = 10' },
  'CP-09': { paso: 'CP-09 Cantidad actual visible en el formulario (776)', esperado: 'Al elegir #776 se muestra la cantidad actual (10) en solo lectura' },
  'CP-10': { paso: 'CP-10 Dosis por individuo en vivo (776)', esperado: 'Al escribir dosis 20 aparece la dosis por individuo 2,0 en el formulario' },
  'CP-11': { paso: 'CP-11 Guardar POBLACIONAL → respuesta API', esperado: '201 (200 solo si ya estaba EN_TRATAMIENTO); VALIDADO; dosis_por_individuo = "2.0000"; costo_total_medicamento = 4000; fecha_fin_retiro = hoy+3' },
  'CP-12': { paso: 'CP-12 Estado del activo 776 (RF-44)', esperado: 'GET /activos-biologicos/776 → EN_TRATAMIENTO' },
  'CP-13': { paso: 'CP-13 dosis_por_individuo enviada en el body (999)', esperado: '4xx, o 2xx con dosis_por_individuo = "2.0000"; nunca queda guardado 999' },
  'CP-14': { paso: 'CP-14 Rollback del sandbox y verificación fuera de él', esperado: 'Rollback 2xx; sin sandbox no aparecen los registros de la corrida y 778/776 conservan su estado inicial' },
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
const ctx = {
  hoy: '',
  sandboxOk: false,
  loginOk: false,
  estadoInicial: {} as Record<number, string>,
  idsCreados: [] as number[],
  enviado1: false,
  enviado2: false,
  enviado13: false,
  rollbackHecho: false,
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
  inter: { request: { body: any }; response?: { statusCode: number; body: any } },
  idActivo: number,
  diasRetiro: number,
  costoEsperado: number,
  dosisIndEsperada: number | null,
): { ok: boolean; obtenido: string; id?: number } {
  const status = inter.response?.statusCode ?? 0;
  const med = inter.response?.body?.medicamento ?? {};
  const fechaEsperada = sumarDias(ctx.hoy, diasRetiro);
  const yaEnTratamiento = ctx.estadoInicial[idActivo] === 'EN_TRATAMIENTO';
  const statusOk = status === 201 || (status === 200 && yaEnTratamiento);
  const bodyLimpio = !Object.prototype.hasOwnProperty.call(inter.request.body ?? {}, 'dosis_por_individuo');
  const dosisInd = med.dosis_por_individuo;
  const dosisOk = dosisIndEsperada === null ? dosisInd === null || dosisInd === undefined : num(dosisInd) === dosisIndEsperada;
  const checks: [string, boolean][] = [
    [`HTTP ${status}${status === 200 ? (yaEnTratamiento ? ' (activo ya EN_TRATAMIENTO)' : ' (inesperado: el activo no estaba EN_TRATAMIENTO)') : ''}`, statusOk],
    [`estado_registro=${med.estado_registro}`, med.estado_registro === 'VALIDADO'],
    [`fecha_fin_retiro=${med.fecha_fin_retiro} (esperada ${fechaEsperada})`, med.fecha_fin_retiro === fechaEsperada],
    [`costo_total_medicamento=${med.costo_total_medicamento}`, num(med.costo_total_medicamento) === costoEsperado],
    [`dosis_por_individuo=${JSON.stringify(dosisInd)}`, dosisOk],
    [`body ${bodyLimpio ? 'sin' : 'CON'} dosis_por_individuo`, bodyLimpio],
  ];
  const ok = checks.every(([, c]) => c);
  const obtenido = checks.map(([t, c]) => `${c ? '' : '✗ '}${t}`).join('; ');
  return { ok, obtenido, id: typeof med.id_registro_medicamento === 'number' ? med.id_registro_medicamento : undefined };
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

// =====================================================================
describe(`${TC} · RF-76 · Registro de aplicación de medicamento según modalidad`, () => {
  before(() => {
    const requeridas = ['API_BASE_URL', 'VET_EMAIL', 'VET_PASSWORD', 'TEST_SANDBOX_SECRET', 'ZONA_HORARIA'];
    const faltan = requeridas.filter((k) => !String(Cypress.env(k) || '').trim());
    if (faltan.length) {
      throw new Error(`[${TC}] Faltan variables de entorno: ${faltan.join(', ')}. Se aborta antes del login.`);
    }
    ctx.hoy = hoyEnZona();
    cy.fijarZonaHoraria(zona());
    cy.startSandbox(RUN_ID); // antes de cualquier login: el token nace dentro del sandbox
  });

  // Cypress borra los intercepts antes de cada it(): se vuelve a aplicar el del sandbox.
  beforeEach(() => {
    cy.aplicarSandbox();
  });

  // ── Sub-caso 1 · INDIVIDUAL ───────────────────────────────────────────
  it('CP-01..CP-03 · login del Veterinario dentro del sandbox y apertura del formulario', { retries: 0 }, () => {
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
            registrar('CP-02', ok && hayMenu && hayPestana, `ruta ${rutaRaw}; menú Suministros: ${hayMenu ? 'sí' : 'no'}; pestaña Medicamentos: ${hayPestana ? 'sí' : 'no'}; título visible: ${ok ? 'sí' : 'no'}`);
          });
        });
      });
    });

    // CP-03 · botón habilitado y diálogo
    abrirFormulario().then(({ habilitado, abierto }) => {
      registrar('CP-03', habilitado && abierto, `botón habilitado: ${habilitado ? 'sí' : 'no'}; diálogo abierto: ${abierto ? 'sí' : 'no'}`);
      if (abierto) cy.screenshot('cp03-formulario-abierto', { capture: 'viewport' });
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
              registrar(
                'CP-06',
                hayToast && toastConFecha && hayFila && validado,
                `toast de éxito: ${hayToast ? 'sí' : 'no'}; toast con ${fechaFin}: ${toastConFecha ? 'sí' : 'no'} («${toast.slice(0, 160)}»); fila «En retiro hasta…»: ${hayFila ? 'sí' : 'no'}; estado Validado: ${validado ? 'sí' : 'no'}`,
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
      if (r.id) ctx.idsCreados.push(r.id);
      registrar('CP-05', r.ok, r.obtenido);
    });

    // CP-06
    verificarUI();
  });

  it('CP-07 · el activo 778 queda EN_TRATAMIENTO (RF-44)', () => {
    exigirSandbox();
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_IND}` }).then((r) => {
      const est = estadoActivo(r.body);
      registrar('CP-07', r.status === 200 && est === 'EN_TRATAMIENTO', `HTTP ${r.status}; estado ${est} (inicial ${ctx.estadoInicial[ACTIVO_IND]})`);
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
      registrar('CP-09', ok, ok ? `se muestra la cantidad actual ${CANTIDAD_POB} en solo lectura` : 'el formulario no muestra la cantidad actual del activo poblacional');
    });

    // CP-10 · dosis por individuo en vivo (DEFECTO CONOCIDO: hoy no existe)
    cy.get('#medicamento-dosis').clear().type(String(DOSIS_POB));
    cy.esperarCondicion(muestraDosisPorIndividuo, 8000).then((ok) => {
      registrar('CP-10', ok, ok ? 'se muestra la dosis por individuo 2,0 en vivo' : `el formulario no muestra la dosis por individuo al escribir ${DOSIS_POB}`);
      cy.screenshot('cp10-formulario-poblacional', { capture: 'viewport' });
    });

    // CP-11 · se evalúa aunque CP-09/CP-10 fallen
    llenarFormulario({ activo: ACTIVO_POB, via: 'ORAL', hora: '08:00', dosis: DOSIS_POB, retiro: 3, costo: 200, omitirActivoYDosis: true });
    interceptarPost('postPob');
    cy.contains('[role="dialog"] button', RE.guardar).click();
    cy.wait('@postPob', { timeout: 60000 }).then((inter) => {
      ctx.enviado2 = true;
      const r = evaluarRegistro(inter, ACTIVO_POB, 3, 4000, 2);
      if (r.id) ctx.idsCreados.push(r.id);
      registrar('CP-11', r.ok, r.obtenido);
    });
  });

  it('CP-12 · el activo 776 queda EN_TRATAMIENTO (RF-44)', () => {
    exigirSandbox();
    cy.apiSandbox({ method: 'GET', path: `/activos-biologicos/${ACTIVO_POB}` }).then((r) => {
      const est = estadoActivo(r.body);
      registrar('CP-12', r.status === 200 && est === 'EN_TRATAMIENTO', `HTTP ${r.status}; estado ${est} (inicial ${ctx.estadoInicial[ACTIVO_POB]})`);
    });
  });

  it('CP-13 · dosis_por_individuo enviada en el body no se acepta como entrada', () => {
    exigirSandbox();
    if (ctx.enviado13) return; // reintento: no se repite la escritura
    cy.apiSandbox({ method: 'POST', path: '/suministros/medicamentos', body: cuerpoPostDirecto() }).then((r) => {
      ctx.enviado13 = true;
      const med = r.body?.medicamento ?? {};
      if (r.status >= 400 && r.status < 500) {
        registrar('CP-13', true, `HTTP ${r.status} (${r.body?.error_code ?? 'rechazado'}): el campo no se acepta`);
        return;
      }
      if (r.status < 200 || r.status >= 300) {
        registrar('CP-13', false, `HTTP ${r.status} inesperado`);
        return;
      }
      const id = med.id_registro_medicamento as number | undefined;
      if (typeof id === 'number') ctx.idsCreados.push(id);
      // Se confirma también lo que quedó guardado, no solo lo que respondió el POST.
      cy.apiSandbox({ method: 'GET', path: `/suministros/medicamentos?id_activo_biologico=${ACTIVO_POB}` }).then((lista) => {
        const guardado = (lista.body?.items ?? []).find((m: any) => m.id_registro_medicamento === id);
        const respOk = num(med.dosis_por_individuo) === 2;
        const guardadoOk = !!guardado && num(guardado.dosis_por_individuo) === 2;
        registrar(
          'CP-13',
          respOk && guardadoOk,
          `HTTP ${r.status}; respuesta dosis_por_individuo=${JSON.stringify(med.dosis_por_individuo)}; guardado=${guardado ? JSON.stringify(guardado.dosis_por_individuo) : '(no encontrado en el listado)'}`,
        );
      });
    });
  });

  // ── Cierre ────────────────────────────────────────────────────────────
  it('CP-14 · rollback del sandbox y verificación sin sandbox', () => {
    cy.rollbackSandbox(RUN_ID).then((res) => {
      ctx.rollbackHecho = true;
      const rollbackOk = res.status >= 200 && res.status < 300;

      // 1) El token emitido dentro del sandbox ya no existe en BD → 401 sin sandbox.
      cy.apiSinSandbox('/suministros/medicamentos', 'sandbox').then((viejo) => {
        // Si el login de CP-01 falló, no se reintenta aquí: cada intento fallido acerca
        // la cuenta al bloqueo (5 intentos).
        if (!ctx.loginOk) {
          registrar('CP-14', false, `rollback HTTP ${res.status}; sin verificación fuera del sandbox porque el login de CP-01 falló`);
          return;
        }
        // 2) Nuevo login del Veterinario, ya sin sandbox, para leer el estado real
        //    (el token del sandbox se revierte con el rollback).
        cy.clearAllCookies({ log: false });
        cy.loginUI(String(Cypress.env('VET_EMAIL')), String(Cypress.env('VET_PASSWORD'))).then((salio) => {
          cy.esperarToken('fuera', 30000).then(() => {
            cy.estadoSandbox().then((s) => {
              if (!salio || !s.hayTokenFuera) {
                registrar('CP-14', false, `rollback HTTP ${res.status}; token del sandbox sin sandbox → HTTP ${viejo.status}; no se pudo iniciar sesión fuera del sandbox para verificar`);
                return;
              }
              const ids = new Set(ctx.idsCreados);
              cy.apiSinSandbox(`/suministros/medicamentos?id_activo_biologico=${ACTIVO_IND}`, 'fuera').then((l1) => {
                cy.apiSinSandbox(`/suministros/medicamentos?id_activo_biologico=${ACTIVO_POB}`, 'fuera').then((l2) => {
                  cy.apiSinSandbox(`/activos-biologicos/${ACTIVO_IND}`, 'fuera').then((a1) => {
                    cy.apiSinSandbox(`/activos-biologicos/${ACTIVO_POB}`, 'fuera').then((a2) => {
                      const items = [...(l1.body?.items ?? []), ...(l2.body?.items ?? [])];
                      const restos = items.filter((m: any) => ids.has(m.id_registro_medicamento)).map((m: any) => m.id_registro_medicamento);
                      const est1 = estadoActivo(a1.body);
                      const est2 = estadoActivo(a2.body);
                      const listasOk = l1.status === 200 && l2.status === 200 && restos.length === 0;
                      const estadosOk = est1 === ctx.estadoInicial[ACTIVO_IND] && est2 === ctx.estadoInicial[ACTIVO_POB];
                      registrar(
                        'CP-14',
                        rollbackOk && listasOk && estadosOk && ids.size > 0,
                        `rollback HTTP ${res.status}; token del sandbox sin sandbox → HTTP ${viejo.status}; ` +
                          `registros de la corrida (${[...ids].join(', ') || 'ninguno capturado'}) visibles sin sandbox: ${restos.length ? restos.join(', ') : 'ninguno'}; ` +
                          `778 ${est1} (inicial ${ctx.estadoInicial[ACTIVO_IND]}); 776 ${est2} (inicial ${ctx.estadoInicial[ACTIVO_POB]})`,
                      );
                    });
                  });
                });
              });
            });
          });
        });
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
        const cp = resultados.get('CP-14');
        if (cp && cp.estado === 'FALLA' && cp.obtenido.startsWith('No alcanzado')) {
          registrar('CP-14', false, `No alcanzado; rollback de respaldo en after() → HTTP ${res.status}`);
        }
      });
    }
    cy.wrap(null, { log: false }).then(() => {
      const reporte = { tc: TC, checkpoints: ORDEN.map((id) => resultados.get(id) as Checkpoint) };
      if (!ctx.sandboxOk) {
        const ahora = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const stamp = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
        const rutaInvalida = `evidencias/run_INVALIDA_${stamp}.json`;
        cy.task('writeResult', { file: rutaInvalida, content: JSON.stringify(reporte, null, 2) });
        console.log(`\n[TC-M05-G13] Sandbox NO confirmado en CP-01: corrida INVÁLIDA por ambiente. Reporte guardado en ${rutaInvalida} (NO se escribió en resultados/).\n`);
      } else {
        cy.task('writeResult', { file: ARCHIVO_RESULTADO, content: JSON.stringify(reporte, null, 2) });
      }
    });
  });
});
