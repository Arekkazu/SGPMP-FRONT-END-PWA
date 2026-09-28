// TC-M09-G22 V2 — TEST real. Los intercept solo observan; ninguna respuesta se sustituye.
// Verifica visualmente el umbral que Newman creo y persistio. No emite ningun POST de umbral.
Cypress.Screenshot.defaults({ blackout: ['input[type="password"]', 'input[type="email"]'], capture: 'viewport' });

const CASO = Cypress.env('caso') as string;
const EV = Cypress.env('evidencia') as any;
const P = EV.persistido;

describe('TC-M09-G22 V2 — configuraciones ambientales validas', () => {
  it(`${CASO} — el umbral persistido es visible y correcto en la UI`, () => {
    expect(EV.idCreado, 'Newman debe haber creado el registro').to.be.a('number');
    expect(P, 'detalle persistido por GET').to.not.eq(null);
    const observado: any = { caso: CASO, idCreadoPorNewman: EV.idCreado, especie: EV.especie, variable: EV.variable };
    const posts: any[] = [];

    cy.intercept('POST', '**/sesiones/').as('login');
    cy.visit('/login');
    cy.get('input[type="email"]').type(Cypress.env('email'), { log: false });
    cy.get('input[type="password"]').type(Cypress.env('password'), { log: false });
    cy.get('button[type="submit"]').click();
    cy.wait('@login', { log: false }).its('response.statusCode').should('eq', 200);
    cy.location('pathname').should('not.include', 'login');

    cy.intercept('POST', '**/configuracion/umbrales', (req) => { req.continue((res) => { posts.push({ status: res.statusCode }); }); }).as('crear');
    cy.intercept('GET', '**/configuracion/variables-ambientales*').as('variables');
    cy.contains('nav.ds-sidebar button', /^Configuración$/).should('have.attr', 'aria-disabled', 'false').click();
    cy.location('pathname').should('eq', '/configuracion');
    cy.contains('button', /^Por especie$/i).click();

    // Seleccion exacta por nombre: "Bovino" no debe confundirse con "Bovino Qa Je".
    cy.get('button').filter((_, el) => Array.from(el.querySelectorAll('*')).some((n) => n.children.length === 0 && (n.textContent || '').trim() === EV.especie.nombre))
      .should('have.length', 1).click();
    cy.intercept('GET', '**/configuracion/umbrales?*').as('umbrales');
    cy.contains('button', 'Umbrales Ambientales').click();
    cy.wait('@umbrales', { log: false }).its('response.statusCode').should('eq', 200);
    cy.wait('@variables', { log: false }).its('response.statusCode').should('eq', 200);

    cy.contains('tr', `#${EV.idCreado}`).as('fila').should('be.visible');
    cy.get('@fila').should('contain.text', EV.variable.nombre)
      .and('contain.text', `${P.valor_min} – ${P.valor_max}`)
      .and('contain.text', 'Activo');
    for (const nivel of ['normal', 'precaucion', 'critico']) {
      const n = P.niveles.find((x: any) => x.nivel === nivel);
      cy.get('@fila').should('contain.text', `${n.limite_inferior}–${n.limite_superior}`);
    }
    cy.get('@fila').invoke('text').then((t) => { observado.filaVisible = String(t).replace(/\s+/g, ' ').trim(); });
    cy.contains(EV.especie.nombre).should('be.visible');
    cy.screenshot(`${CASO}-configuracion-visible`);
    cy.get('@fila').screenshot(`${CASO}-fila-umbral-${EV.idCreado}`);
    // Niveles critico y estado quedan fuera del contenedor con scroll horizontal: se desplaza solo para capturarlos.
    cy.get('@fila').closest('div[style*="overflow"]').scrollTo('right', { ensureScrollable: false });
    cy.get('@fila').screenshot(`${CASO}-fila-umbral-${EV.idCreado}-niveles-estado`);
    cy.get('@fila').closest('div[style*="overflow"]').scrollTo('left', { ensureScrollable: false });

    // Legibilidad objetiva de la celda "Rango general": texto real, color computado,
    // fondo efectivo y contraste (WCAG AA 4.5:1). Se registra antes de afirmar.
    cy.get('@fila').find('td').eq(2).then(($td) => {
      const td = $td[0] as HTMLElement;
      const win = td.ownerDocument.defaultView as Window;
      const rgba = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [255, 255, 255, 1]; const p = m[1].split(',').map((x) => Number(x.trim())); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
      let el: HTMLElement | null = td; let fondo = 'rgba(0, 0, 0, 0)';
      while (el) { const b = win.getComputedStyle(el).backgroundColor; if (rgba(b)[3] > 0) { fondo = b; break; } el = el.parentElement; }
      if (rgba(fondo)[3] === 0) fondo = 'rgb(255, 255, 255)';
      const cs = win.getComputedStyle(td);
      const [r, g, b, a] = rgba(cs.color); const [fr, fg, fb] = rgba(fondo);
      const mix = [r, g, b].map((v, i) => v * a + [fr, fg, fb][i] * (1 - a));
      const lum = (c: number[]) => { const l = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
      const L1 = lum(mix), L2 = lum([fr, fg, fb]);
      const contraste = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      // React emite "{min}", " – ", "{max}" como nodos de texto separados: se unen los directos.
      const nodos = Array.from(td.childNodes).filter((n) => n.nodeType === 3 && (n.textContent || '').trim());
      const rango = td.ownerDocument.createRange();
      if (nodos.length) { rango.setStartBefore(nodos[0]); rango.setEndAfter(nodos[nodos.length - 1]); }
      const rect = nodos.length ? rango.getBoundingClientRect() : null;
      observado.rangoGeneralCelda = {
        textoNodo: nodos.length ? nodos.map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim() : null, color: cs.color, opacity: cs.opacity, visibility: cs.visibility,
        webkitTextFillColor: (cs as any).webkitTextFillColor, fondoEfectivo: fondo, contraste: Math.round(contraste * 100) / 100,
        rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
      };
    });
    cy.get('@fila').find('td').eq(2).screenshot(`${CASO}-celda-rango-general`);

    cy.get('@umbrales', { log: false }).then((i: any) => {
      const u = (i.response.body.items || []).filter((x: any) => x.id_umbral_ambiental === EV.idCreado);
      expect(u, 'la UI recibe exactamente el registro creado').to.have.length(1);
      expect(u[0].id_especie).to.eq(EV.especie.id);
      expect(u[0].id_variable_ambiental).to.eq(EV.variable.id);
      observado.apiUi = { id: u[0].id_umbral_ambiental, valor_min: u[0].valor_min, valor_max: u[0].valor_max, es_activo: u[0].es_activo, niveles: u[0].niveles };
    });
    cy.get('@crear.all', { log: false }).then((reqs: any) => {
      observado.postsDeUmbralEmitidos = reqs.length;
      expect(reqs.length, 'Cypress no emite POST de umbral').to.eq(0);
      cy.task('evidenciaUi', { ...observado, posts }, { log: false });
    });
    cy.then(() => {
      const c = observado.rangoGeneralCelda;
      expect(c.textoNodo, 'la celda Rango general contiene el rango persistido').to.eq(`${P.valor_min} – ${P.valor_max}`);
      expect(c.contraste, `Rango general legible: contraste ${c.contraste}:1 (color ${c.color} / ${c.webkitTextFillColor} sobre ${c.fondoEfectivo})`).to.be.at.least(4.5);
    });
  });
});
