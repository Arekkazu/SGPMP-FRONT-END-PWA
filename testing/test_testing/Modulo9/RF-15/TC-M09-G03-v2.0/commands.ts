/// <reference types="cypress" />

export interface EspecieItem {
  id_especie?: number;
  id?: number;
  nombre: string;
  descripcion?: string | null;
  es_activo?: boolean;
  activo?: boolean;
  grupo_manejo?: string;
  fecha_creacion?: string;
  fecha_creacion_especie?: string;
  fecha_actualizacion?: string | null;
  fecha_actualizacion_especie?: string | null;
}

declare global {
  namespace Cypress {
    interface Chainable {
      loginUI(email?: string, password?: string): Chainable<string>;
      preflightEspecie(token: string): Chainable<EspecieItem>;
    }
  }
}

Cypress.Commands.add(
  'loginUI',
  (
    email = Cypress.env('ADMIN_EMAIL'),
    password = Cypress.env('TEST_ADMIN_PASSWORD') || Cypress.env('ADMIN_PASSWORD'),
  ) => {
    cy.visit('/login');
    cy.get('input[autocomplete="email"]').clear().type(email);
    cy.get('input[autocomplete="current-password"]').clear().type(password, { log: false });
    cy.contains('button', /ingresar|iniciar sesión|login/i).click();
    cy.wait('@postLogin', { timeout: 30000 }).then((interception) => {
      const body = interception.response?.body || {};
      const token = body.token || body.access_token || (body.data && body.data.token) || '';
      expect(token, 'Token capturado del POST /sesiones/').to.be.a('string').and.not.be.empty;
      Cypress.env('CAPTURED_TOKEN', token);
    });
    return cy.then(() => {
      const token = Cypress.env('CAPTURED_TOKEN') as string;
      return cy.wrap(token);
    });
  },
);

Cypress.Commands.add('preflightEspecie', (token: string) => {
  const apiUrl = Cypress.env('API_BASE_URL');
  return cy.request({
    method: 'GET',
    url: `${apiUrl}/configuracion/especies?solo_activas=false`,
    headers: { Authorization: `Bearer ${token}` },
    failOnStatusCode: false,
  }).then((res) => {
    expect(res.status, 'Preflight GET status').to.eq(200);
    const raw = res.body;
    const lista: EspecieItem[] = Array.isArray(raw)
      ? raw
      : (raw.items || raw.data || raw.especies || []);

    // Reglas duras (Ajuste J):
    // - NO F-04 / "Ovino QA2" (match exacto case-insensitive /^ovino\s+qa2$/i)
    // - ACTIVA (es_activo === true o activo === true)
    // - Sin dígitos en el nombre (/\d/)
    // - Sin "Editado" (/editado/i)
    // - Sin token "Qa" (/\bqa\b/i)
    // - fecha_actualizacion != null (detección dinámica de fecha_actualizacion | fecha_actualizacion_especie)
    const candidata = lista.find((it) => {
      const act = it.activo !== undefined ? it.activo : it.es_activo;
      if (!act) return false;

      const nom = (it.nombre || '').trim();
      if (/^ovino\s+qa2$/i.test(nom)) return false;
      if (/\d/.test(nom)) return false;
      if (/editado/i.test(nom)) return false;
      if (/\bqa\b/i.test(nom)) return false;

      const fechaAct = it.fecha_actualizacion !== undefined ? it.fecha_actualizacion : it.fecha_actualizacion_especie;
      if (fechaAct === null || fechaAct === undefined || String(fechaAct).trim() === '') return false;

      return true;
    });

    if (!candidata) {
      throw new Error(
        'PREFLIGHT ABORT: No se encontró una especie candidata activa que cumpla TODAS las reglas duras (activa, sin dígitos, sin Editado, sin token Qa, no Ovino QA2, fecha_actualizacion != null).'
      );
    }

    Cypress.env('TARGET_ESPECIE', candidata);
    return cy.wrap(candidata);
  });
});

export {};
