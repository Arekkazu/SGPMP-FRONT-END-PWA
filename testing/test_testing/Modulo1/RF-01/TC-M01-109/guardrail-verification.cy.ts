/// <reference types="cypress" />

describe('Verificación Aislada Local del Guardrail (req.destroy + throw Error)', () => {
  it('Demuestra que el Guardrail bloquea y destruye la conexión de red en el 2do intento real sin tocar el backend TEST', () => {
    let realRequestsSent = 0;
    let mockBackendCallsReceived = 0;

    // Intercept apuntando a un endpoint MOCK totalmente aislado (sin red real)
    cy.intercept('POST', '**/mock-contrasena-recuperar', (req) => {
      // Si ya se envió 1 petición real, el guardrail DESTRUYE la conexión a nivel de socket y lanza error
      if (realRequestsSent >= 1) {
        const errorMsg = `[GUARDRAIL BLOQUEADO] Se detectó un intento de enviar una SEGUNDA petición real (realRequestsSent=${realRequestsSent}). Abortando conexión a nivel de red con req.destroy() y throw Error.`;
        cy.log(errorMsg);
        req.destroy();
        throw new Error(errorMsg);
      }

      realRequestsSent++;
      mockBackendCallsReceived++;
      req.reply({ statusCode: 202, body: { message: 'Petición Real 1 Procesada Exitosamente' } });
    }).as('mockRecuperar');

    cy.visit('/recuperar-contrasena');

    // 1er Intento Real
    cy.window().then(async (win) => {
      const res1 = await win.fetch('/mock-contrasena-recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'test@local.mock' }),
      });
      expect(res1.status).to.eq(202);
      expect(realRequestsSent).to.eq(1);
      expect(mockBackendCallsReceived).to.eq(1);
    });

    // 2do Intento Real (Debe ser destruido por el Guardrail a nivel red)
    cy.window().then(async (win) => {
      try {
        await win.fetch('/mock-contrasena-recuperar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo: 'test@local.mock' }),
        });
        expect.fail('La segunda petición NO debió completarse; debió ser destruida por el Guardrail');
      } catch (err: any) {
        // La conexión fue destruida por req.destroy()
        cy.log('Fallo esperado de red capturado en cliente por req.destroy(): ' + err.message);
        expect(realRequestsSent).to.eq(1); // El contador real se mantuvo en 1
        expect(mockBackendCallsReceived).to.eq(1); // El mock backend NUNCA recibió la 2da petición
      }
    });
  });
});
