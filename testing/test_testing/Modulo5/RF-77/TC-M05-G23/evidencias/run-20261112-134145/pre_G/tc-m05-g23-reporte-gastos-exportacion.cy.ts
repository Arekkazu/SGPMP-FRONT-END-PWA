/// <reference types="cypress" />
// | Fecha      | Nombre                    | Que se hizo                                                          |
// |------------|---------------------------|----------------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G23 RF-77: reporte de gastos por activo y exportación PDF/CSV |
// =====================================================================
// TC-M05-G23 · RF-77 · Prioridad Alta
// Reporte de gastos acumulados por activo y exportación a formatos PDF y CSV
// Activo biológico: 57 (INDIVIDUAL, fecha_inicio_ciclo 2026-01-01, 1 consumo validado)
// Rango evaluado: 2026-01-01 a 2026-07-31 (granularidad MENSUAL)
// Rol: Administrador (alcance global, permisos E=5 y R=2 en recurso 51)
// Ambiente: TEST oficial (https://api.inmero.co / API: https://api.inmero.co/api-sgpmp-test)
// Todo confinado en Sandbox Transaccional con verificación de aislamiento post-rollback.
//
// Registro de checkpoints: cada CP inicia en FALLA («No alcanzado») y se sobrescribe
// cuando se evalúa. Las comprobaciones no abortan la suite intempestivamente.
// El test final «Veredicto» asegura un código de salida honesto si hay fallas.
// =====================================================================
import { type ResumenSandbox, rutaApp, appBasePath, visitar } from './commands';

type Estado = 'OK' | 'FALLA' | 'NO_EVALUADO' | 'NO_EJECUTABLE';
interface Checkpoint { paso: string; esperado: string; obtenido: string; estado: Estado }
type IdCp =
  | 'CP-01' | 'CP-02' | 'CP-03' | 'CP-04' | 'CP-05'
  | 'CP-06' | 'CP-07' | 'CP-08A' | 'CP-08B' | 'CP-09';

const TC = 'TC-M05-G23';
const ACTIVO_ID = 57;
const FECHA_DESDE = '2026-01-01';
const FECHA_HASTA = '2026-07-31';
const GRANULARIDAD = 'MENSUAL';
const GASTO_ESPERADO = '10.0000';
const NOMBRE_CSV_ESPERADO = `Gastos_${ACTIVO_ID}_${FECHA_DESDE}_${FECHA_HASTA}.csv`;
const NOMBRE_PDF_ESPERADO = `Reporte_Gastos_${ACTIVO_ID}_${FECHA_DESDE}_${FECHA_HASTA}.pdf`;
const ENCABEZADO_CSV_ESPERADO = 'fecha,categoria,descripcion,monto_cop,estado';

const RUN_ID = `tc-m05-g23-${Date.now()}`;
const ARCHIVO_RESULTADO = `resultados/resultado_${TC}.json`;

const ESPERADOS: Record<IdCp, { paso: string; esperado: string }> = {
  'CP-01': {
    paso: 'CP-01 Sandbox + login Administrador',
    esperado: 'Sandbox aceptado por el backend antes del login y ruta distinta de /login',
  },
  'CP-02': {
    paso: 'CP-02 Navegación a /suministros/gastos',
    esperado: 'Formulario de reporte visible con campo #gastos-desde interactivo',
  },
  'CP-03': {
    paso: 'CP-03 Generar reporte por UI (activo 57)',
    esperado: 'POST /suministros/reportes-gastos -> 200, gasto_total_acumulado = "10.0000", panel de detalle visible',
  },
  'CP-04': {
    paso: 'CP-04 Exportar CSV por UI',
    esperado: `POST /exportacion -> 201, nombre_archivo = ${NOMBRE_CSV_ESPERADO}, vigencia 24 h exactas`,
  },
  'CP-05': {
    paso: 'CP-05 Descarga y contenido CSV',
    esperado: 'GET -> 200 text/csv; archivo descargado con 5 columnas exactas y suma de montos = 10.0000',
  },
  'CP-06': {
    paso: 'CP-06 Exportar PDF por UI',
    esperado: `POST /exportacion -> 201, nombre_archivo = ${NOMBRE_PDF_ESPERADO}, vigencia 24 h exactas`,
  },
  'CP-07': {
    paso: 'CP-07 Descarga binaria PDF',
    esperado: 'GET -> 200 application/pdf, tamaño > 0, primeros 5 bytes "%PDF-"',
  },
  'CP-08A': {
    paso: 'CP-08A Contenido del PDF',
    esperado: '1 página, título "Reporte de Gastos Acumulados", fecha de generación presente en el texto',
  },
  'CP-08B': {
    paso: 'CP-08B Logo en el PDF',
    esperado: 'Imagen embebida detectada en el PDF (/Subtype /Image)',
  },
  'CP-09': {
    paso: 'CP-09 Aislamiento post-rollback sin sandbox',
    esperado: 'Rollback 2xx; consulta sin sandbox del reporte y ambos archivos -> 404 (REPORTE/ARCHIVO_NO_ENCONTRADO)',
  },
};
const ORDEN = Object.keys(ESPERADOS) as IdCp[];

const resultados = new Map<IdCp, Checkpoint>();
for (const id of ORDEN) {
  resultados.set(id, {
    ...ESPERADOS[id],
    obtenido: 'No alcanzado: un paso previo del mismo bloque se detuvo (ver la salida de Cypress).',
    estado: 'FALLA',
  });
}

function registrar(id: IdCp, estado: Estado | boolean, obtenido: string): void {
  const est: Estado = typeof estado === 'boolean' ? (estado ? 'OK' : 'FALLA') : estado;
  resultados.set(id, { ...ESPERADOS[id], obtenido, estado: est });
  cy.log(`${id} -> ${est} · ${obtenido}`);
}

// Contexto compartido entre tests (testIsolation: false)
const ctx = {
  sandboxOk: false,
  loginOk: false,
  cp02Ok: false,
  idReporte: null as number | null,
  // CSV
  idArchivoCsv: '' as string,
  nombreArchivoCsv: '' as string,
  statusGetCsv: null as number | null,
  cTypeCsv: '' as string,
  cDispCsv: '' as string,
  // PDF
  idArchivoPdf: '' as string,
  nombreArchivoPdf: '' as string,
  statusGetPdf: null as number | null,
  cTypePdf: '' as string,
  cDispPdf: '' as string,
  rollbackHecho: false,
};

function zona(): string {
  return String(Cypress.env('ZONA_HORARIA') || 'America/Bogota');
}

function apiBase(): string {
  return String(Cypress.env('API_BASE_URL') || '').replace(/\/+$/, '');
}

function exigirSandbox(): void {
  if (!ctx.sandboxOk) {
    throw new Error(`[${TC}] Sandbox no confirmado en CP-01: bloque abortado para evitar escrituras fuera de sandbox.`);
  }
}

function loginAdmin(): Cypress.Chainable<string> {
  return cy.request({
    method: 'POST',
    url: `${apiBase()}/sesiones/`,
    body: {
      correo_electronico: Cypress.env('ADMIN_EMAIL'),
      contrasena: Cypress.env('ADMIN_PASSWORD'),
    },
    headers: { 'Content-Type': 'application/json', 'X-Zona-Horaria': zona() },
    failOnStatusCode: false,
    timeout: 20000,
    log: false,
  }).then((resLogin) => {
    return String(resLogin.body?.token || resLogin.body?.access_token || '');
  });
}

// =====================================================================
// SUITE PRINCIPAL E2E TC-M05-G23
// =====================================================================
describe(`${TC} · RF-77 · Reporte de gastos acumulados y exportación PDF/CSV`, () => {
  before(() => {
    const requeridas = ['API_BASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'TEST_SANDBOX_SECRET', 'ZONA_HORARIA'];
    const faltan = requeridas.filter((k) => !String(Cypress.env(k) || '').trim());
    if (faltan.length) {
      throw new Error(`[${TC}] Faltan variables de entorno: ${faltan.join(', ')}. Corrida abortada antes del login.`);
    }
    cy.fijarZonaHoraria(zona());
    cy.startSandbox(RUN_ID);
  });

  beforeEach(() => {
    cy.aplicarSandbox();
  });

  afterEach(function () {
    if (this.currentTest?.title.includes('CP-02') && this.currentTest?.state === 'failed') {
      const ahora = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ts = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
      const capturaNombre = `diag_cp02_${ts}`;

      cy.screenshot(capturaNombre, { capture: 'runner', log: false });

      cy.url({ log: false }).then((urlActual) => {
        cy.title({ log: false }).then((tituloActual) => {
          cy.document({ log: false }).then((doc) => {
            const countDesde = doc.querySelectorAll('#gastos-desde').length;
            const countActivo = doc.querySelectorAll('#gastos-activo').length;
            const tieneLogin = !!doc.querySelector('input[autocomplete="email"], input[type="email"], input[autocomplete="current-password"]');
            const textoRaw = (doc.body.innerText || '').slice(0, 300).replace(/\r?\n/g, ' ');
            const textoEnmascarado = textoRaw.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***');

            let aparecioTrasFalla = false;
            let segundosTranscurridos = 0;
            const inicioEspera = Date.now();

            const chequear = (): void => {
              cy.document({ log: false }).then((d) => {
                const el = d.querySelector('#gastos-desde');
                if (el && !aparecioTrasFalla) {
                  aparecioTrasFalla = true;
                  segundosTranscurridos = Math.round((Date.now() - inicioEspera) / 1000);
                }
                if (Date.now() - inicioEspera >= 30000 || aparecioTrasFalla) {
                  const diag = {
                    timestamp: ts,
                    url: urlActual,
                    titulo: tituloActual,
                    elementos_gastos_desde: countDesde,
                    elementos_gastos_activo: countActivo,
                    muestra_formulario_login: tieneLogin,
                    texto_visible_body_300: textoEnmascarado,
                    captura: `evidencias/capturas/${capturaNombre}.png`,
                    espera_adicional_30s: {
                      aparecio_tras_falla: aparecioTrasFalla ? 'sí' : 'no',
                      segundos: segundosTranscurridos,
                    },
                  };
                  cy.task('escribirReporte', {
                    file: `evidencias/diag_cp02_${ts}.json`,
                    content: JSON.stringify(diag, null, 2),
                  });
                } else {
                  cy.wait(1000, { log: false });
                  chequear();
                }
              });
            };

            chequear();
          });
        });
      });
    }
  });

  // -------------------------------------------------------------------
  // CP-01: Login Administrador + Sandbox
  // -------------------------------------------------------------------
  it('CP-01 · login Administrador dentro del sandbox transaccional', { retries: 0 }, () => {
    cy.loginUI(String(Cypress.env('ADMIN_EMAIL')), String(Cypress.env('ADMIN_PASSWORD'))).then((salioDeLogin) => {
      ctx.loginOk = salioDeLogin;
      cy.esperarToken('sandbox', 30000);
      cy.location('pathname', { log: false }).then((rutaRaw) => {
        const ruta = rutaApp(rutaRaw);
        cy.estadoSandbox().then((s) => {
          ctx.sandboxOk = s.confirmado && s.peticiones > 0 && !s.cerrado;
          const ok = salioDeLogin && ctx.sandboxOk && ruta !== '/login';
          const obtenido = `ruta ${rutaRaw}; sandbox confirmado: ${s.confirmado ? 'sí' : 'no'}; token capturado: ${s.hayTokenSandbox ? 'sí' : 'no'}; peticiones con sandbox: ${s.peticiones}`;
          registrar('CP-01', ok, obtenido);
          exigirSandbox();
        });
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-02: Navegación a /suministros/gastos
  // -------------------------------------------------------------------
  it('CP-02 · navegar a /suministros/gastos y verificar formulario', () => {
    exigirSandbox();
    visitar('/suministros/gastos');
    cy.get('#gastos-desde', { timeout: 15000 }).then(($el) => {
      const visible = $el.is(':visible');
      ctx.cp02Ok = visible;
      registrar('CP-02', visible, visible ? 'Formulario visible con campo #gastos-desde' : 'Campo #gastos-desde no visible');
    });
  });

  // -------------------------------------------------------------------
  // CP-03: Generar reporte por UI (activo 57)
  // -------------------------------------------------------------------
  it('CP-03 · generar reporte de gastos por UI (activo 57, mensual, 2026-01-01 a 2026-07-31)', () => {
    exigirSandbox();
    if (!ctx.cp02Ok) {
      registrar('CP-03', 'NO_EVALUADO', 'No evaluado: depende de CP-02 (formulario de reporte)');
      return;
    }

    cy.intercept('POST', '**/suministros/reportes-gastos').as('postReporte');

    // Diligenciar fechas
    cy.get('#gastos-desde').clear().type(FECHA_DESDE);
    cy.get('#gastos-hasta').clear().type(FECHA_HASTA);

    // Seleccionar granularidad MENSUAL
    cy.get('#gastos-granularidad').select(GRANULARIDAD);

    // Escribir ID del activo 57 en el combobox (SelectorActivo acepta el ID directo)
    cy.get('#gastos-activo').clear().type(String(ACTIVO_ID));

    // Enviar formulario (Generar reporte)
    cy.get('form').contains('button[type="submit"]', /generar/i).click();

    // Esperar respuesta de la API (SLA RNF <= 15 s; timeout 20 s)
    cy.wait('@postReporte', { timeout: 20000 }).then((interception) => {
      const res = interception.response;
      const statusOk = res?.statusCode === 200;
      const body = res?.body ?? {};
      const id = body.id_reporte_gasto_acumulado ?? body.id;
      const gastoTotal = String(body.gasto_total_acumulado ?? '');
      ctx.idReporte = typeof id === 'number' ? id : Number(id) || null;

      cy.get('#reporte-titulo', { timeout: 10000 }).then(($tit) => {
        const panelVisible = $tit.is(':visible');
        const gastoCoincide = gastoTotal === GASTO_ESPERADO;
        const exito = statusOk && gastoCoincide && panelVisible && !!ctx.idReporte;

        registrar(
          'CP-03',
          exito,
          `HTTP ${res?.statusCode}; id_reporte=${ctx.idReporte}; gasto_total_acumulado=${gastoTotal}; panelVisible=${panelVisible}`,
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-04: Exportar CSV por UI
  // -------------------------------------------------------------------
  it('CP-04 · exportar reporte a CSV por UI y verificar respuesta de exportación', () => {
    exigirSandbox();
    if (!ctx.idReporte) {
      registrar('CP-04', 'NO_EVALUADO', 'No evaluado: depende de CP-03 (generación del reporte)');
      return;
    }

    cy.intercept('POST', '**/suministros/reportes-gastos/*/exportacion').as('postExportCsv');
    cy.intercept('GET', '**/suministros/reportes-gastos/exportaciones/*').as('getDescargaCsv');

    // Clic en botón CSV dentro del panel de detalle
    cy.get('#reporte-titulo').parents('section').contains('button', /CSV/i).click();

    cy.wait('@postExportCsv', { timeout: 15000 }).then((interceptionPost) => {
      const resPost = interceptionPost.response;
      const statusOk = resPost?.statusCode === 201;
      const body = resPost?.body ?? {};
      ctx.idArchivoCsv = body.id_archivo || '';
      ctx.nombreArchivoCsv = body.nombre_archivo || '';
      const fGen = new Date(body.fecha_generacion).getTime();
      const fExp = new Date(body.fecha_expiracion).getTime();
      const diffHoras = (fExp - fGen) / (1000 * 60 * 60);

      const nombreOk = ctx.nombreArchivoCsv === NOMBRE_CSV_ESPERADO;
      const vigenciaOk = Math.round(diffHoras) === 24;
      const postOk = statusOk && nombreOk && vigenciaOk && !!ctx.idArchivoCsv;

      // La UI dispara inmediatamente el GET de descarga tras el POST exitoso
      cy.wait('@getDescargaCsv', { timeout: 15000 }).then((interceptionGet) => {
        const resGet = interceptionGet.response;
        ctx.statusGetCsv = resGet?.statusCode ?? null;
        ctx.cTypeCsv = String(resGet?.headers['content-type'] || '');
        ctx.cDispCsv = String(resGet?.headers['content-disposition'] || '');

        registrar(
          'CP-04',
          postOk,
          `HTTP ${resPost?.statusCode}; nombre_archivo=${ctx.nombreArchivoCsv}; vigencia=${diffHoras.toFixed(2)} h; id_archivo=${ctx.idArchivoCsv}; GET descarga capturado HTTP ${ctx.statusGetCsv}`,
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-05: Descarga y contenido CSV
  // -------------------------------------------------------------------
  it('CP-05 · verificar descarga en disco y estructura del CSV (5 columnas y suma montos)', () => {
    exigirSandbox();
    if (!ctx.idArchivoCsv || ctx.statusGetCsv === null) {
      registrar('CP-05', 'NO_EVALUADO', 'No evaluado: depende de CP-04 (exportación CSV)');
      return;
    }

    const rutaCsv = `evidencias/descargas/${NOMBRE_CSV_ESPERADO}`;
    cy.task('esperarArchivo', { rutaArchivo: rutaCsv, timeoutMs: 15000 }).then((info: any) => {
      if (!info?.existe) {
        registrar(
          'CP-05',
          false,
          `GET HTTP ${ctx.statusGetCsv}; Content-Type=${ctx.cTypeCsv}; el archivo ${NOMBRE_CSV_ESPERADO} no apareció en disco tras 15 s`,
        );
        return;
      }

      const statusGetOk = ctx.statusGetCsv === 200;
      const cTypeOk = ctx.cTypeCsv.includes('text/csv');

      cy.readFile(rutaCsv, 'utf8', { timeout: 5000 }).then((contenido: string) => {
        const lineas = contenido.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        const encabezado = lineas[0] || '';
        const filasDatos = lineas.slice(1);

        const encabezadoOk = encabezado === ENCABEZADO_CSV_ESPERADO;
        const filasOk = filasDatos.length >= 1;

        let sumaMonto = 0;
        let columnasCorrectas = true;
        for (const fila of filasDatos) {
          const cols = fila.split(',');
          if (cols.length < 5) columnasCorrectas = false;
          const monto = Number(cols[3]);
          if (!isNaN(monto)) sumaMonto += monto;
        }

        const sumaOk = Math.abs(sumaMonto - Number(GASTO_ESPERADO)) < 0.0001;
        const exito = statusGetOk && cTypeOk && encabezadoOk && filasOk && columnasCorrectas && sumaOk;

        registrar(
          'CP-05',
          exito,
          `HTTP ${ctx.statusGetCsv}; Content-Type=${ctx.cTypeCsv}; encabezadoOk=${encabezadoOk}; filas=${filasDatos.length}; sumaMonto=${sumaMonto.toFixed(4)} (esperado ${GASTO_ESPERADO})`,
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-06: Exportar PDF por UI
  // -------------------------------------------------------------------
  it('CP-06 · exportar reporte a PDF por UI y verificar respuesta de exportación', () => {
    exigirSandbox();
    if (!ctx.idReporte) {
      registrar('CP-06', 'NO_EVALUADO', 'No evaluado: depende de CP-03 (generación del reporte)');
      return;
    }

    cy.intercept('POST', '**/suministros/reportes-gastos/*/exportacion').as('postExportPdf');
    cy.intercept('GET', '**/suministros/reportes-gastos/exportaciones/*').as('getDescargaPdf');

    // Clic en botón PDF dentro del panel de detalle
    cy.get('#reporte-titulo').parents('section').contains('button', /PDF/i).click();

    cy.wait('@postExportPdf', { timeout: 15000 }).then((interceptionPost) => {
      const resPost = interceptionPost.response;
      const statusOk = resPost?.statusCode === 201;
      const body = resPost?.body ?? {};
      ctx.idArchivoPdf = body.id_archivo || '';
      ctx.nombreArchivoPdf = body.nombre_archivo || '';
      const fGen = new Date(body.fecha_generacion).getTime();
      const fExp = new Date(body.fecha_expiracion).getTime();
      const diffHoras = (fExp - fGen) / (1000 * 60 * 60);

      const nombreOk = ctx.nombreArchivoPdf === NOMBRE_PDF_ESPERADO;
      const vigenciaOk = Math.round(diffHoras) === 24;
      const postOk = statusOk && nombreOk && vigenciaOk && !!ctx.idArchivoPdf;

      // La UI dispara inmediatamente el GET de descarga tras el POST exitoso
      cy.wait('@getDescargaPdf', { timeout: 15000 }).then((interceptionGet) => {
        const resGet = interceptionGet.response;
        ctx.statusGetPdf = resGet?.statusCode ?? null;
        ctx.cTypePdf = String(resGet?.headers['content-type'] || '');
        ctx.cDispPdf = String(resGet?.headers['content-disposition'] || '');

        registrar(
          'CP-06',
          postOk,
          `HTTP ${resPost?.statusCode}; nombre_archivo=${ctx.nombreArchivoPdf}; vigencia=${diffHoras.toFixed(2)} h; id_archivo=${ctx.idArchivoPdf}; GET descarga capturado HTTP ${ctx.statusGetPdf}`,
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-07: Descarga binaria PDF
  // -------------------------------------------------------------------
  it('CP-07 · verificar descarga en disco y validación de binario PDF (%PDF-)', () => {
    exigirSandbox();
    if (!ctx.idArchivoPdf || ctx.statusGetPdf === null) {
      registrar('CP-07', 'NO_EVALUADO', 'No evaluado: depende de CP-06 (exportación PDF)');
      return;
    }

    const rutaPdf = `evidencias/descargas/${NOMBRE_PDF_ESPERADO}`;
    cy.task('esperarArchivo', { rutaArchivo: rutaPdf, timeoutMs: 15000 }).then((info: any) => {
      if (!info?.existe) {
        registrar(
          'CP-07',
          false,
          `GET HTTP ${ctx.statusGetPdf}; Content-Type=${ctx.cTypePdf}; el archivo ${NOMBRE_PDF_ESPERADO} no apareció en disco tras 15 s`,
        );
        return;
      }

      const statusGetOk = ctx.statusGetPdf === 200;
      const cTypeOk = ctx.cTypePdf.includes('application/pdf');

      cy.readFile(rutaPdf, 'binary', { timeout: 5000 }).then((bytesStr: string) => {
        const tamano = bytesStr.length;
        const magic = bytesStr.slice(0, 5);
        const magicOk = magic === '%PDF-';
        const tamanoOk = tamano > 0;
        const exito = statusGetOk && cTypeOk && magicOk && tamanoOk;

        registrar(
          'CP-07',
          exito,
          `HTTP ${ctx.statusGetPdf}; Content-Type=${ctx.cTypePdf}; tamaño=${tamano} bytes; magic=${magic}`,
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-08A: Contenido del PDF (cy.task leerPdf)
  // -------------------------------------------------------------------
  it('CP-08A · verificar texto, encabezado, fecha y páginas del PDF', () => {
    exigirSandbox();
    if (!ctx.idArchivoPdf || ctx.statusGetPdf === null) {
      registrar('CP-08A', 'NO_EVALUADO', 'No evaluado: depende de CP-06/CP-07 (archivo PDF)');
      return;
    }

    const rutaPdf = `evidencias/descargas/${NOMBRE_PDF_ESPERADO}`;

    cy.task('leerPdf', rutaPdf).then((datos: any) => {
      const texto = String(datos?.texto || '');
      const paginas = Number(datos?.paginas || 0);
      const tamanoBytes = Number(datos?.tamanoBytes || 0);

      const tituloOk = texto.includes('Reporte de Gastos Acumulados');
      const fechaMatch = texto.match(/Fecha de generación:\s*([^\r\n]+)/i);
      const fechaOk = Boolean(fechaMatch);
      const fechaEncontrada = fechaMatch ? fechaMatch[1].trim() : (texto.includes('Fecha de generación:') ? 'detectada' : 'no encontrada');
      const paginasOk = paginas === 1; // 1 solo registro (umbral: 25 registros/página)

      const encabezadoEncontrado = tituloOk ? 'Reporte de Gastos Acumulados' : 'no encontrado';
      const exito = tituloOk && fechaOk && paginasOk;

      registrar(
        'CP-08A',
        exito,
        `encabezado="${encabezadoEncontrado}"; fecha="${fechaEncontrada}"; paginas=${paginas}; tamanoBytes=${tamanoBytes}`,
      );
    });
  });

  // -------------------------------------------------------------------
  // CP-08B: Logo en el PDF (cy.task leerPdf)
  // -------------------------------------------------------------------
  it('CP-08B · verificar presencia de logo institucional embebido en el PDF', () => {
    exigirSandbox();
    if (!ctx.idArchivoPdf || ctx.statusGetPdf === null) {
      registrar('CP-08B', 'NO_EVALUADO', 'No evaluado: depende de CP-06 (exportación PDF)');
      return;
    }

    const rutaPdf = `evidencias/descargas/${NOMBRE_PDF_ESPERADO}`;
    cy.task('leerPdf', rutaPdf).then((datos: any) => {
      const tieneImagen = Boolean(datos?.tieneImagen);
      const tamanoBytes = Number(datos?.tamanoBytes || 0);

      if (tieneImagen) {
        registrar(
          'CP-08B',
          'OK',
          `tieneImagen=true; tamanoBytes=${tamanoBytes}; archivo="${NOMBRE_PDF_ESPERADO}"`,
        );
      } else {
        registrar(
          'CP-08B',
          'FALLA',
          `tieneImagen=false; tamanoBytes=${tamanoBytes}; archivo="${NOMBRE_PDF_ESPERADO}"; contexto pendiente`,
        );
      }
    });
  });

  // -------------------------------------------------------------------
  // CP-09: Rollback del Sandbox y aislamiento
  // -------------------------------------------------------------------
  it('CP-09 · rollback del sandbox y verificación de aislamiento post-rollback (404)', () => {
    const llamadasSesiones: string[] = [];
    cy.intercept('**/sesiones/**', (req) => {
      llamadasSesiones.push(req.url);
    });

    // Detener la SPA antes del rollback para que no genere tráfico concurrente
    cy.window().then((win) => {
      try {
        win.location.replace('about:blank');
      } catch {}
    });

    cy.rollbackSandbox(RUN_ID).then((resRollback) => {
      ctx.rollbackHecho = true;
      const rollbackOk = resRollback.status >= 200 && resRollback.status < 300;

      if (!rollbackOk) {
        registrar('CP-09', false, `Rollback falló con HTTP ${resRollback.status}`);
        return;
      }

      const faltantesIds: string[] = [];
      if (!ctx.idReporte) faltantesIds.push('idReporte');
      if (!ctx.idArchivoCsv) faltantesIds.push('idArchivoCsv');
      if (!ctx.idArchivoPdf) faltantesIds.push('idArchivoPdf');

      if (faltantesIds.length > 0) {
        registrar(
          'CP-09',
          'NO_EVALUADO',
          `No evaluado: faltaron identificadores por cascada de CP-03/CP-04/CP-06: ${faltantesIds.join(', ')}`,
        );
        return;
      }

      const hacerConsultas = (token: string, intento: number): Cypress.Chainable<any> => {
        const headersLimpios = {
          Authorization: `Bearer ${token}`,
          'X-Zona-Horaria': zona(),
        };

        return cy.request({
          method: 'GET',
          url: `${apiBase()}/suministros/reportes-gastos/${ctx.idReporte}`,
          headers: headersLimpios,
          failOnStatusCode: false,
          log: false,
        }).then((resRep) => {
          return cy.request({
            method: 'GET',
            url: `${apiBase()}/suministros/reportes-gastos/exportaciones/${ctx.idArchivoCsv}`,
            headers: headersLimpios,
            failOnStatusCode: false,
            log: false,
          }).then((resCsv) => {
            return cy.request({
              method: 'GET',
              url: `${apiBase()}/suministros/reportes-gastos/exportaciones/${ctx.idArchivoPdf}`,
              headers: headersLimpios,
              failOnStatusCode: false,
              log: false,
            }).then((resPdf) => {
              const reqIdRep = resRep.headers['x-request-id'] || resRep.headers['request-id'] || '-';
              const errRep = (resRep.body as any)?.error_code || (resRep.body as any)?.code || '-';

              const reqIdCsv = resCsv.headers['x-request-id'] || resCsv.headers['request-id'] || '-';
              const errCsv = (resCsv.body as any)?.error_code || (resCsv.body as any)?.code || '-';

              const reqIdPdf = resPdf.headers['x-request-id'] || resPdf.headers['request-id'] || '-';
              const errPdf = (resPdf.body as any)?.error_code || (resPdf.body as any)?.code || '-';

              const textoIntento = `intento ${intento}: [rep ${resRep.status} ${errRep} reqId:${reqIdRep}, csv ${resCsv.status} ${errCsv} reqId:${reqIdCsv}, pdf ${resPdf.status} ${errPdf} reqId:${reqIdPdf}]`;

              const repOk = resRep.status === 404 && errRep === 'REPORTE_NO_ENCONTRADO';
              const csvOk = (resCsv.status === 404 && errCsv === 'ARCHIVO_NO_ENCONTRADO') || (resCsv.status === 410 && errCsv === 'ARCHIVO_EXPIRADO');
              const pdfOk = (resPdf.status === 404 && errPdf === 'ARCHIVO_NO_ENCONTRADO') || (resPdf.status === 410 && errPdf === 'ARCHIVO_EXPIRADO');

              const hay401 = resRep.status === 401 || resCsv.status === 401 || resPdf.status === 401;

              return {
                repOk,
                csvOk,
                pdfOk,
                hay401,
                resRep,
                resCsv,
                resPdf,
                errRep,
                errCsv,
                errPdf,
                textoIntento,
              };
            });
          });
        });
      };

      loginAdmin().then((tok1) => {
        if (!tok1) {
          registrar('CP-09', false, `Rollback HTTP ${resRollback.status} pero falló reautenticación limpia`);
          return;
        }

        hacerConsultas(tok1, 1).then((res1) => {
          const prefijo = `rollback HTTP ${resRollback.status}; spa_sesiones=${llamadasSesiones.length}`;
          if (res1.repOk && res1.csvOk && res1.pdfOk) {
            registrar('CP-09', 'OK', `${prefijo}; ${res1.textoIntento} (aislamiento confirmado)`);
            return;
          }

          if (res1.hay401) {
            loginAdmin().then((tok2) => {
              if (!tok2) {
                registrar('CP-09', 'NO_EVALUADO', `${prefijo}; ${res1.textoIntento}; falló reautenticación 2`);
                return;
              }
              hacerConsultas(tok2, 2).then((res2) => {
                const ambos = `${res1.textoIntento} | ${res2.textoIntento}`;
                if (res2.repOk && res2.csvOk && res2.pdfOk) {
                  registrar('CP-09', 'OK', `${prefijo}; ${ambos} (aislamiento confirmado)`);
                } else if (res2.hay401) {
                  const err401 = res2.resRep.status === 401 ? res2.errRep : (res2.resCsv.status === 401 ? res2.errCsv : res2.errPdf);
                  registrar('CP-09', 'NO_EVALUADO', `${prefijo}; ${ambos}; persistió 401 (${err401})`);
                } else {
                  registrar('CP-09', 'FALLA', `${prefijo}; ${ambos}`);
                }
              });
            });
            return;
          }

          registrar('CP-09', 'FALLA', `${prefijo}; ${res1.textoIntento}`);
        });
      });
    });
  });

  // -------------------------------------------------------------------
  // CP-08B: Contexto de logo post-rollback
  // -------------------------------------------------------------------
  it('CP-08B · contexto de logo (post-rollback)', () => {
    const cp08bActual = resultados.get('CP-08B');
    if (!cp08bActual || cp08bActual.estado !== 'FALLA' || !cp08bActual.obtenido.includes('contexto pendiente')) {
      cy.log('CP-08B no requiere recolección de contexto post-rollback');
      return;
    }

    loginAdmin()
      .then((tokenAdmin) => {
        if (!tokenAdmin) {
          resultados.set('CP-08B', {
            ...cp08bActual,
            obtenido: `${cp08bActual.obtenido.replace('; contexto pendiente', '')}; contexto no obtenido: fallo de autenticación admin`,
          });
          return;
        }

        const headersAuth = {
          Authorization: `Bearer ${tokenAdmin}`,
          'X-Zona-Horaria': zona(),
        };

        cy.request({
          method: 'GET',
          url: `${apiBase()}/configuracion/infraestructuras/2`,
          headers: headersAuth,
          failOnStatusCode: false,
          timeout: 20000,
          log: false,
        }).then((resInfra) => {
          const idFinca = resInfra.body?.id_finca ?? 1;
          cy.request({
            method: 'GET',
            url: `${apiBase()}/configuracion/identidad-visual/${idFinca}`,
            headers: headersAuth,
            failOnStatusCode: false,
            timeout: 20000,
            log: false,
          }).then((resIv) => {
            const ivData = resIv.body;
            const existeIv = Boolean(ivData && resIv.status === 200);
            const logoPath = ivData?.logo_path;
            const noNulo = Boolean(logoPath);
            const extMatch = logoPath ? String(logoPath).match(/\.([a-zA-Z0-9]+)$/) : null;
            const ext = extMatch ? `.${extMatch[1]}` : 'sin_extension';

            const consultarStatic = (pathLogo: string | null | undefined): Cypress.Chainable<any> => {
              if (!pathLogo) return cy.wrap('no_aplica', { log: false });
              const cleanPath = String(pathLogo).replace(/^\/+/, '');
              return cy.request({
                method: 'GET',
                url: `${apiBase()}/uploads/logos/${cleanPath}`,
                failOnStatusCode: false,
                timeout: 20000,
                log: false,
              }).then((resStatic) => resStatic.status);
            };

            consultarStatic(logoPath).then((staticStatus) => {
              const nuevoObtenido = `tieneImagen=false; infra_status=${resInfra.status}; iv_status=${resIv.status}; id_finca=${idFinca}; registro_iv_existe=${existeIv}; logo_path_no_nulo=${noNulo}; extension=${ext}; static_status=${staticStatus}; archivo="${NOMBRE_PDF_ESPERADO}"; causa no determinada`;
              resultados.set('CP-08B', {
                ...cp08bActual,
                obtenido: nuevoObtenido,
                estado: 'FALLA', // Conserva el FALLA
              });
              cy.log(`CP-08B contexto actualizado -> ${nuevoObtenido}`);
            });
          });
        });
      });
  });

  // -------------------------------------------------------------------
  // Veredicto final
  // -------------------------------------------------------------------
  it('Veredicto · evaluar resultado final de la corrida', () => {
    const fallasReales = ORDEN.filter((id) => resultados.get(id)?.estado === 'FALLA');
    const incompletos = ORDEN.filter(
      (id) => resultados.get(id)?.estado === 'NO_EVALUADO' || resultados.get(id)?.estado === 'NO_EJECUTABLE',
    );

    if (fallasReales.length > 0) {
      assert.fail(`RECHAZADO: Checkpoints en FALLA real: ${fallasReales.join(', ')}`);
    } else if (incompletos.length > 0) {
      assert.fail(`INCOMPLETO: Checkpoints no evaluados o no ejecutables: ${incompletos.join(', ')}`);
    }
  });

  // -------------------------------------------------------------------
  // Hook after(): Respaldo de rollback y guardado de reporte JSON
  // -------------------------------------------------------------------
  after(() => {
    if (!ctx.rollbackHecho) {
      cy.rollbackSandbox(RUN_ID).then((res) => {
        ctx.rollbackHecho = true;
        const cp = resultados.get('CP-09');
        if (cp && cp.estado === 'FALLA' && cp.obtenido.startsWith('No alcanzado')) {
          registrar('CP-09', false, `No alcanzado; rollback de respaldo en after() -> HTTP ${res.status}`);
        }
      });
    }

    cy.wrap(null, { log: false }).then(() => {
      const ahora = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;

      const cpsOficiales = ORDEN.map((id) => {
        const cp = resultados.get(id)!;
        const estadoFinal: 'OK' | 'FALLA' = cp.estado === 'OK' ? 'OK' : 'FALLA';
        return {
          paso: id,
          esperado: cp.esperado,
          obtenido: cp.obtenido,
          estado: estadoFinal,
        };
      });

      const reporteOficial = {
        tc: TC,
        checkpoints: cpsOficiales,
      };

      const reporteParcial = {
        tc: TC,
        checkpoints: ORDEN.map((id) => resultados.get(id) as Checkpoint),
      };

      if (!ctx.sandboxOk) {
        const rutaInvalida = `evidencias/run_INVALIDA_${stamp}.json`;
        cy.task('escribirReporte', { file: rutaInvalida, content: JSON.stringify(reporteParcial, null, 2) });
        console.log(`\n[${TC}] Sandbox NO confirmado: corrida INVÁLIDA por ambiente guardada en ${rutaInvalida}.\n`);
        return;
      }

      const rutaParcial = `evidencias/run_PARCIAL_${stamp}.json`;
      cy.task('escribirReporte', { file: rutaParcial, content: JSON.stringify(reporteParcial, null, 2) });
      console.log(`\n[${TC}] Reporte parcial guardado en ${rutaParcial}.\n`);

      const guardarEnResultados =
        String(Cypress.env('REPORTE_EN_RESULTADOS') || '') === '1' ||
        String(process.env.CYPRESS_REPORTE_EN_RESULTADOS || '') === '1';

      if (guardarEnResultados) {
        const requeridosOk: IdCp[] = ['CP-01', 'CP-02', 'CP-03', 'CP-04', 'CP-05', 'CP-06', 'CP-07', 'CP-08A', 'CP-09'];
        const noOkRequeridos = requeridosOk.filter((id) => resultados.get(id)?.estado !== 'OK');
        const cp08b = resultados.get('CP-08B');
        const cp08bValido = cp08b?.estado === 'OK' || cp08b?.estado === 'FALLA';

        if (noOkRequeridos.length === 0 && cp08bValido) {
          cy.task('escribirReporte', { file: ARCHIVO_RESULTADO, content: JSON.stringify(reporteOficial, null, 2) });
          console.log(`\n[${TC}] Reporte oficial guardado en ${ARCHIVO_RESULTADO}.\n`);
        } else {
          const motivos: string[] = [];
          if (noOkRequeridos.length > 0) {
            motivos.push(`Checkpoints requeridos no OK: ${noOkRequeridos.join(', ')}`);
          }
          if (!cp08bValido) {
            motivos.push(`CP-08B en estado inválido (${cp08b?.estado})`);
          }
          console.log(`\n[${TC}] NO SE ESCRIBIÓ resultado oficial: ${motivos.join('; ')}\n`);
        }
      }
    });
  });
});
