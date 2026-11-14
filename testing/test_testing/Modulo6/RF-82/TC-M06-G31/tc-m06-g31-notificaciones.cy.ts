// | Fecha      | Nombre      | Que se hizo                                                                      |
// |------------|-------------|----------------------------------------------------------------------------------|
// | 2026-11-09 | Laura032005 | TC-M06-G31 RF-82..85: notificaciones y alertas al Contador en la bandeja (139 a 145) |

// TC-M06-G31 · RF-82, RF-83, RF-84, RF-85 · Interfaz (Cypress): notificaciones y alertas al Contador y aislamiento frente a otros roles.
// Casos: TC-M06-139, 140, 141 (141a Productor y 141b Veterinario), 142, 143, 144 y 145.
//
// Ejecutar (PowerShell, desde esta carpeta; una sola corrida a la vez, no con pytest ni Newman):
//   npm install                                   (solo la primera vez)
//   $env:CYPRESS_TEST_SANDBOX_SECRET   = "<secreto del sandbox>"
//   $env:CYPRESS_QA_CONTRASENA_ADMIN   = "<contraseña de admin@pecuaria.co>"
//   $env:CYPRESS_QA_CONTRASENA_INGENIERO   = "<contraseña de ingedecampo6@gmail.com>"
//   $env:CYPRESS_QA_CONTRASENA_PRODUCTOR   = "<contraseña de daniiella.vargass@gmail.com>"
//   $env:CYPRESS_QA_CONTRASENA_VETERINARIO = "<contraseña de mariajosecastillovargas57@gmail.com>"
//   npx cypress run --browser chrome
// Reporte: RESULTADOS\resultado_TC-M06-G31.html   Capturas: RESULTADOS\capturas
//
// Cómo se hace cada caso (ficha TC-M06-G31):
//  1. Sesión en la interfaz como Contador: la cuenta QA del ingeniero (id 158) toma el rol Contador con PATCH DENTRO del run
//     y el login se hace FUERA del sandbox (comandos.ts, cy.loginUI).
//  2. Los datos previos (especie, activo, precio RF-89, evento de M02) se crean por API dentro del mismo run (m06-api.js, cy.task).
//  3. cy.intercept agrega X-Test-Run-Id y X-Sandbox-Secret a las peticiones de la interfaz y se limpia la caché local de notificaciones.
//  4. Se abre la bandeja y se comprueba que haya una notificación nueva y no leída del aviso que pide la ficha.
// El run se cierra (rollback) al terminar cada caso.
//
// Qué NO prueba: el contenido exacto del mensaje no está fijado en RF-82..85, por eso se busca por palabras del aviso
// (sin distinguir mayúsculas ni tildes). La bandeja del front solo muestra lo que el backend entrega en GET /notificaciones;
// si la notificación no aparece, el hallazgo es del backend (nota de la ficha).

import type { Bandeja } from './commands';

interface Contexto {
  admin: string;
  ing: string;
  run: string;
  base: { total: number; no_leidas: number; items: { id: number; mensaje: string }[] };
  datos: any;
}

// Dirección de la API que usa la interfaz (la fija cy.loginUI).
const api = (): string => String(Cypress.env('_api'));

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Si una precondición no se cumple el caso queda omitido (BLOQUEADO / NO CONCLUYENTE), nunca aprobado ni fallido por eso.
// Devuelve true si se puede seguir. El motivo se escribe ANTES de omitir: un skip síncrono cancela los comandos pendientes y el log se perdía.
function exigir(t: Mocha.Context, r: any, que: string): boolean {
  if (r && r.estado === 'LISTO') return true;
  const estado = r && r.estado ? r.estado : 'ERROR';
  const motivo = r && r.motivo ? r.motivo : 'sin detalle';
  cy.task('log', `[${estado}] ${que}: ${motivo}`).then(() => {
    // Criterio de QA (13-nov): una precondición que no se cumple deja el caso en rojo con el motivo, nunca omitido.
    throw new Error(`${que}: ${motivo}`);
  });
  return false;
}

// Prepara un caso: login del Administrador por API, sesión del Contador en la interfaz, run nuevo y datos por API.
function prepararContador(t: Mocha.Context, caso: string): Cypress.Chainable<Contexto> {
  const ctx = {} as Contexto;
  cy.loginUI('ingeniero').then((tok) => { ctx.ing = tok; });
  cy.then(() => cy.task('m06:login', { rol: 'admin', api: api() }, { log: false })).then((r: any) => { if (exigir(t, r, 'login del Administrador')) ctx.admin = r.token; });
  cy.nuevaCorrida().then((run) => { ctx.run = run; });
  cy.then(() => cy.task('m06:notificaciones', { run: ctx.run, token: ctx.ing, api: api() }, { log: false }))
    .then((r: any) => { if (exigir(t, r, 'bandeja del Contador antes del caso')) ctx.base = r; });
  cy.then(() => cy.task('m06:preparar', { caso, run: ctx.run, admin: ctx.admin, ing: ctx.ing, api: api() }, { log: false }))
    .then((r: any) => {
      if (!exigir(t, r, `datos previos del caso ${caso}`)) return;
      ctx.datos = r;
      cy.task('log', `Caso ${caso}: datos preparados ${JSON.stringify(r)}`);
    });
  return cy.then(() => ctx);
}

function resumen(b: Bandeja): string {
  return JSON.stringify(b.items.slice(0, 6).map((i) => `${i.noLeida ? '[nueva] ' : ''}${i.titulo}: ${i.mensaje.slice(0, 90)}`));
}

// La bandeja del Contador debe mostrar, como notificación nueva y no leída, un aviso que mencione lo que pide la ficha.
function exigirAviso(ctx: Contexto, caso: string, buscar: RegExp, esperado: string, opciones?: RegExp) {
  cy.leerBandeja(`TC-M06-${caso}-bandeja-contador`).then((b) => {
    cy.task('log', `Caso ${caso}: bandeja del Contador (${b.noLeidas} sin leer de ${b.total}; antes ${ctx.base.no_leidas} de ${ctx.base.total}): ${resumen(b)}`);
    const aviso = b.items.filter((i) => i.noLeida && buscar.test(norm(`${i.titulo} ${i.mensaje}`)));
    const contexto = `${esperado}. La bandeja del Contador mostró ${b.items.length} notificaciones (${b.noLeidas} sin leer, antes ${ctx.base.no_leidas}): ${resumen(b)}. `
      + `Eventos de auditoría del activo: ${JSON.stringify(ctx.datos.auditoria)}`;
    expect(aviso.length, contexto).to.be.greaterThan(0);
    expect(b.noLeidas, `${esperado}: el contador de no leídas debe aumentar`).to.be.greaterThan(ctx.base.no_leidas);
    if (opciones) {
      expect(aviso.some((i) => opciones.test(norm(`${i.titulo} ${i.mensaje}`))), `${esperado}: el aviso debe indicar las opciones disponibles (cargar precio o costo)`).to.eq(true);
    }
  });
}

describe('TC-M06-G31 · Interfaz: notificaciones y alertas al Contador (RF-82, RF-83, RF-84, RF-85)', () => {
  before(() => {
    cy.exigirVariables();
  });

  beforeEach(() => {
    cy.cerrarCorrida(); // por si un caso omitido (skip) dejó un run abierto
    cy.cabecerasSandbox();
  });

  afterEach(() => {
    cy.cerrarCorrida();
  });

  it('1. (TC-M06-139) El Contador ve la alerta ADVERTENCIA por valoración por costo (VALORACION_POR_COSTO)', function () {
    prepararContador(this, '139').then((ctx) => {
      exigirAviso(ctx, '139', /valoracion por costo|valoracion_por_costo|por costo/,
        'El Contador debe ver en la bandeja la alerta de advertencia por valoración por costo');
    });
  });

  it('2. (TC-M06-140) El Contador ve la notificación de bloqueo por NACIMIENTO sin precio de mercado, con las opciones disponibles', function () {
    prepararContador(this, '140').then((ctx) => {
      exigirAviso(ctx, '140', /bloque|sin valor|sin precio|no se puede reconocer/,
        'El Contador debe ver la notificación de bloqueo del reconocimiento por nacimiento sin precio de mercado', /precio|costo|opcion/);
    });
  });

  // 141a y 141b: la notificación del Contador (la del caso 139) no debe aparecer en la bandeja de otro rol.
  // El login de cada rol va en una sesión separada de la interfaz y FUERA del sandbox. Si el backend no generó la notificación al Contador,
  // no hay nada que aislar y el caso queda NO VERIFICABLE (omitido), no aprobado.
  (['productor', 'veterinario'] as const).forEach((rol, n) => {
    const id = n === 0 ? '141a' : '141b';
    it(`3. (TC-M06-${id}) Las notificaciones del Contador no aparecen en la bandeja del ${rol === 'productor' ? 'Productor' : 'Veterinario'}`, function () {
      const ctx = {} as Contexto;
      cy.loginUI(rol);
      cy.then(() => cy.task('m06:login', { rol: 'admin', api: api() }, { log: false })).then((r: any) => { if (exigir(this, r, 'login del Administrador')) ctx.admin = r.token; });
      // El Contador de este caso solo se usa por API (sin sesión en la interfaz): nuevo login fuera del sandbox.
      cy.then(() => cy.task('m06:login', { rol: 'ingeniero', api: api() }, { log: false })).then((r: any) => { if (exigir(this, r, 'login del Contador')) ctx.ing = r.token; });
      cy.nuevaCorrida().then((run) => { ctx.run = run; });
      cy.then(() => cy.task('m06:notificaciones', { run: ctx.run, token: ctx.ing, api: api() }, { log: false }))
        .then((r: any) => { if (exigir(this, r, 'bandeja del Contador antes del caso')) ctx.base = r; });
      cy.then(() => cy.task('m06:preparar', { caso: '141', run: ctx.run, admin: ctx.admin, ing: ctx.ing, api: api() }, { log: false }))
        .then((r: any) => { if (exigir(this, r, 'datos previos del caso 141')) ctx.datos = r; });
      cy.then(() => cy.task('m06:notificaciones', { run: ctx.run, token: ctx.ing, api: api() }, { log: false })).then((despues: any) => {
        if (!exigir(this, despues, 'bandeja del Contador después del caso')) return;
        const idsAntes = new Set(ctx.base.items.map((i) => i.id));
        const nuevas = (despues.items as { id: number; mensaje: string }[]).filter((i) => !idsAntes.has(i.id));
        if (nuevas.length === 0) {
          cy.task('log', `[NO VERIFICABLE] 141: el backend no generó ninguna notificación para el Contador (no leídas ${ctx.base.no_leidas} -> ${despues.no_leidas}); no hay nada que aislar. Eventos de auditoría del activo: ${JSON.stringify(ctx.datos.auditoria)}`)
            .then(() => {
              throw new Error(`NO VERIFICABLE (en rojo por criterio de QA): el backend no generó ninguna notificación para el Contador (no leídas ${ctx.base.no_leidas} -> ${despues.no_leidas}); no hay nada que aislar. Misma causa que el caso 139 (INC-M06-327).`);
            });
          return;
        }
        cy.leerBandeja(`TC-M06-${id}-bandeja-${rol}`).then((b) => {
          cy.task('log', `Caso ${id}: bandeja del ${rol} (${b.noLeidas} sin leer de ${b.total}): ${resumen(b)}`);
          const mensajes = new Set(nuevas.map((i) => norm(i.mensaje)));
          const filtradas = b.items.filter((i) => mensajes.has(norm(i.mensaje)));
          expect(filtradas.length, `la bandeja del ${rol} no debe mostrar las notificaciones del Contador: ${resumen(b)}`).to.eq(0);
        });
      });
    });
  });

  it('4. (TC-M06-142) El Contador ve la alerta MEDICION_PENDIENTE cuando una medición se hace con estimación', function () {
    prepararContador(this, '142').then((ctx) => {
      exigirAviso(ctx, '142', /medicion_pendiente|medicion pendiente|estimacion|estimad/,
        'El Contador debe ver la alerta de medición pendiente cuando la medición se hace con estimación');
    });
  });

  it('5. (TC-M06-143) El Contador ve la alerta crítica cuando el valor neto es menor o igual a cero', function () {
    prepararContador(this, '143').then((ctx) => {
      exigirAviso(ctx, '143', /valor neto|neto|revision|critic/,
        'El Contador debe ver la alerta crítica (cálculo en revisión requerida) cuando el valor neto es menor o igual a cero');
    });
  });

  it('6. (TC-M06-144) El Contador ve la notificación de que un costo de MANTENIMIENTO se registró como gasto del período', function () {
    prepararContador(this, '144').then((ctx) => {
      exigirAviso(ctx, '144', /mantenimiento|gasto/,
        'El Contador debe ver la notificación de que el costo de mantenimiento se registró como gasto del período');
    });
  });

  it('7. (TC-M06-145) El Contador ve la alerta RECONOCIMIENTO_PENDIENTE cuando el producto cosechado no tiene precio de mercado', function () {
    prepararContador(this, '145').then((ctx) => {
      exigirAviso(ctx, '145', /reconocimiento_pendiente|reconocimiento pendiente|precio del producto|producto/,
        'El Contador debe ver la alerta de reconocimiento pendiente cuando el producto cosechado no tiene precio de mercado');
    });
  });
});
