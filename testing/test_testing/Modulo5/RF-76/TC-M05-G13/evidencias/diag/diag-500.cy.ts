// Sondas de diagnóstico para HTTP 500 en POST /suministros/medicamentos
// TC-M05-G13 (RF-76) · Fase 4-DIAG-500

interface ResultadoSonda {
  nombre: string;
  descripcion: string;
  id_activo: number;
  http_status: number;
  duracion_ms: number;
  hora_utc: string;
  hora_bogota: string;
  error_code: string | null;
  mensaje: string;
  request_id: string | null;
  rollback_status: number;
  estado_registro?: string | null;
  fecha_fin_retiro?: string | null;
  costo_total_medicamento?: string | number | null;
  dosis_por_individuo?: string | number | null;
  estado_activo_antes_rollback?: string | null;
}

const resultados: ResultadoSonda[] = [];

function apiBase(): string {
  const url = String(Cypress.env('API_BASE_URL') || '').replace(/\/+$/, '');
  if (!url) throw new Error('[DIAG-500] API_BASE_URL no está definida.');
  return url;
}

function secreto(): string {
  const s = String(Cypress.env('TEST_SANDBOX_SECRET') || '');
  if (!s) throw new Error('[DIAG-500] TEST_SANDBOX_SECRET no está definida.');
  return s;
}

function zona(): string {
  return String(Cypress.env('ZONA_HORARIA') || 'America/Bogota');
}

function hoyEnZona(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function ahoraEnZona(): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: zona(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function ejecutarSonda(
  nombre: string,
  descripcion: string,
  endpoint: string,
  idActivo: number,
  body: Record<string, unknown>,
) {
  const runId = `DIAG500-${nombre}-${Date.now()}`;
  const base = apiBase();
  const sec = secreto();
  const z = zona();
  const email = String(Cypress.env('VET_EMAIL') || '');
  const pass = String(Cypress.env('VET_PASSWORD') || '');

  cy.log(`[DIAG-500] >>> Iniciando sonda ${nombre} (runId: ${runId})`);

  // 1) Login por API dentro de su propio sandbox
  cy.request({
    method: 'POST',
    url: `${base}/sesiones/`,
    headers: {
      'X-Test-Run-Id': runId,
      'X-Sandbox-Secret': sec,
      'X-Zona-Horaria': z,
    },
    body: {
      correo_electronico: email,
      contrasena: pass,
    },
    failOnStatusCode: false,
    log: false,
  }).then((resLogin) => {
    expect(resLogin.status, `Login API de ${nombre} debe responder 200`).to.equal(200);
    const token: string = resLogin.body?.token;
    expect(token, `Token de login para ${nombre} debe existir`).to.be.a('string');

    const horaUtc = new Date().toISOString();
    const horaBogota = ahoraEnZona();
    const t0 = performance.now();

    // 2) POST de la sonda
    cy.request({
      method: 'POST',
      url: `${base}${endpoint}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Test-Run-Id': runId,
        'X-Sandbox-Secret': sec,
        'X-Zona-Horaria': z,
      },
      body,
      failOnStatusCode: false,
      log: false,
    }).then((resPost) => {
      const t1 = performance.now();
      const duracionMs = Math.round(t1 - t0);
      const reqId =
        (resPost.headers['x-request-id'] as string) ||
        (resPost.headers['traceparent'] as string) ||
        (resPost.headers['x-trace-id'] as string) ||
        null;

      const rawMsg =
        resPost.body?.message ||
        resPost.body?.detail ||
        (typeof resPost.body === 'string' ? resPost.body : JSON.stringify(resPost.body)) ||
        '';
      const mensaje = String(rawMsg).slice(0, 300);
      const errorCode = resPost.body?.error_code || (typeof resPost.body?.detail === 'string' ? resPost.body.detail : null);

      const sondaRes: ResultadoSonda = {
        nombre,
        descripcion,
        id_activo: idActivo,
        http_status: resPost.status,
        duracion_ms: duracionMs,
        hora_utc: horaUtc,
        hora_bogota: horaBogota,
        error_code: errorCode,
        mensaje,
        request_id: reqId,
        rollback_status: 0,
      };

      if (resPost.status >= 200 && resPost.status < 300) {
        const med = resPost.body?.medicamento ?? resPost.body ?? {};
        sondaRes.estado_registro = med.estado_registro || null;
        sondaRes.fecha_fin_retiro = med.fecha_fin_retiro || null;
        sondaRes.costo_total_medicamento = med.costo_total_medicamento ?? med.costo_total ?? null;
        sondaRes.dosis_por_individuo = med.dosis_por_individuo ?? null;
      }

      // 3) GET del activo antes del rollback
      cy.request({
        method: 'GET',
        url: `${base}/activos-biologicos/${idActivo}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Test-Run-Id': runId,
          'X-Sandbox-Secret': sec,
          'X-Zona-Horaria': z,
        },
        failOnStatusCode: false,
        log: false,
      }).then((resActivo) => {
        const est =
          resActivo.body?.nombre_estado ||
          resActivo.body?.estado ||
          (typeof resActivo.body?.id_estado !== 'undefined' ? `ID_${resActivo.body.id_estado}` : null);
        sondaRes.estado_activo_antes_rollback = est;

        // 4) Rollback obligatorio de la corrida
        cy.request({
          method: 'DELETE',
          url: `${base}/test-control/runs/${encodeURIComponent(runId)}`,
          headers: {
            'X-Test-Run-Id': runId,
            'X-Sandbox-Secret': sec,
          },
          failOnStatusCode: false,
          log: false,
        }).then((resRollback) => {
          sondaRes.rollback_status = resRollback.status;
          resultados.push(sondaRes);

          cy.log(
            `[DIAG-500] Sonda ${nombre} completada: HTTP ${resPost.status} (${duracionMs} ms) | Rollback HTTP ${resRollback.status}`,
          );

          expect(
            resRollback.status,
            `Rollback de la sonda ${nombre} (runId: ${runId}) DEBE responder 2xx`,
          ).to.be.within(200, 299);
        });
      });
    });
  });
}

describe('TC-M05-G13 · Diagnóstico HTTP 500 (RF-76)', () => {
  let hoy: string;

  before(() => {
    hoy = hoyEnZona();
    cy.log(`[DIAG-500] Fecha hoy (Bogotá): ${hoy}`);
  });

  it('Sonda C0 · Consumo de alimento RF-75 (control sobre activo 778)', () => {
    ejecutarSonda(
      'C0',
      'Control alimento RF-75 (activo 778, 1.5 kg, tipo 1, costo 1500)',
      '/suministros/consumo-alimentos',
      778,
      {
        id_activo_biologico: 778,
        id_tipo_alimento: 1,
        fecha_consumo: hoy,
        hora_suministro: '08:00',
        cantidad_alimento: 1.5,
        costo_unitario: 1500,
        observaciones: 'Sonda C0 control RF-75',
      },
    );
  });

  it('Sonda P1 · Medicamento sobre 778 con periodo_retiro_dias = 0 (sin RF-44)', () => {
    ejecutarSonda(
      'P1',
      'Medicamento activo 778 con retiro = 0 (no invoca RF-44)',
      '/suministros/medicamentos',
      778,
      {
        id_activo_biologico: 778,
        nombre_medicamento: 'Oxitetraciclina',
        fecha_aplicacion: hoy,
        hora_aplicacion: '08:00',
        via_administracion: 'INTRAMUSCULAR',
        dosis_aplicada: '10',
        unidad_dosis: 'ml',
        periodo_retiro_dias: 0,
        motivo_aplicacion: 'Tratamiento de infección respiratoria',
        costo_unitario: '500',
        nombre_veterinario: 'Dr. Pérez',
      },
    );
  });

  it('Sonda P2 · Medicamento sobre 778 con periodo_retiro_dias = 7 (caso real con RF-44)', () => {
    ejecutarSonda(
      'P2',
      'Medicamento activo 778 con retiro = 7 (caso real con RF-44)',
      '/suministros/medicamentos',
      778,
      {
        id_activo_biologico: 778,
        nombre_medicamento: 'Oxitetraciclina',
        fecha_aplicacion: hoy,
        hora_aplicacion: '08:00',
        via_administracion: 'INTRAMUSCULAR',
        dosis_aplicada: '10',
        unidad_dosis: 'ml',
        periodo_retiro_dias: 7,
        motivo_aplicacion: 'Tratamiento de infección respiratoria',
        costo_unitario: '500',
        nombre_veterinario: 'Dr. Pérez',
      },
    );
  });

  it('Sonda P3 · Medicamento sobre activo 296 (finca 57, dueño Administrador, retiro = 3)', () => {
    ejecutarSonda(
      'P3',
      'Medicamento activo 296 (finca 57, dueño Administrador, retiro = 3, dosis 20)',
      '/suministros/medicamentos',
      296,
      {
        id_activo_biologico: 296,
        nombre_medicamento: 'Oxitetraciclina',
        fecha_aplicacion: hoy,
        hora_aplicacion: '08:00',
        via_administracion: 'ORAL',
        dosis_aplicada: '20',
        unidad_dosis: 'ml',
        periodo_retiro_dias: 3,
        motivo_aplicacion: 'Tratamiento de infección respiratoria',
        costo_unitario: '200',
        nombre_veterinario: 'Dr. Pérez',
      },
    );
  });

  after(() => {
    cy.writeFile('evidencias/diag/diag-500.json', JSON.stringify(resultados, null, 2));
    cy.log(`[DIAG-500] Guardado reporte en evidencias/diag/diag-500.json con ${resultados.length} sondas`);
  });
});

