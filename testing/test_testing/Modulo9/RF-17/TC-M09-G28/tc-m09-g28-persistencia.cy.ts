// TEST real. Los intercept solo observan trafico; ninguna respuesta se sustituye.
// TC-M09-61: sesion A -> registro visible -> logout real -> sesion B nueva -> mismo
// registro y mismos valores. Sin cy.session(), sin esperas fijas, sin force:true.
Cypress.Screenshot.defaults({blackout:['input[type="password"]','input[type="email"]'],capture:'viewport'});

const REG=Cypress.env('registro') as any;
const ID=`#${REG.id_umbral_ambiental}`;
const RANGO=`${REG.valor_min} – ${REG.valor_max}`;

function iniciarSesion(alias:string){
 cy.intercept('POST','**/sesiones/').as(alias);
 cy.visit('/login');
 cy.get('input[type="email"]').type(Cypress.env('email'),{log:false});
 cy.get('input[type="password"]').type(Cypress.env('password'),{log:false});
 cy.get('button[type="submit"]').click();
 cy.wait(`@${alias}`,{log:false}).its('response.statusCode').should('eq',200);
 cy.location('pathname').should('not.include','login');
}

function abrirUmbrales(aliasGet:string,aliasVars:string){
 // El catalogo de variables se intercepta ANTES de navegar: la tabla resuelve el
 // nombre de la variable con esa respuesta y, sin esperarla, la fila puede
 // renderizarse con el marcador "Variable #N".
 cy.intercept('GET','**/configuracion/variables-ambientales*').as(aliasVars);
 cy.contains('nav.ds-sidebar button',/^Configuración$/).should('have.attr','aria-disabled','false').click();
 cy.location('pathname').should('eq','/configuracion');
 cy.contains('button',/^Por especie$/i).click();
 cy.contains('button',REG.especie_nombre).click();
 cy.intercept('GET','**/configuracion/umbrales?*').as(aliasGet);
 cy.contains('button','Umbrales Ambientales').click();
 cy.wait(`@${aliasGet}`,{log:false}).its('response.statusCode').should('eq',200);
 cy.wait(`@${aliasVars}`,{log:false}).its('response.statusCode').should('eq',200);
 // La fila queda estable cuando ya muestra el nombre real de la variable.
 cy.contains('tr',ID).should('be.visible').and('contain.text',REG.variable_nombre);
}

// Lee del registro solo lo que TC-M09-61 debe comparar: identidad, rango, niveles
// y estado. El texto completo de la fila incluye rotulos ajenos a la persistencia.
function leerFila(){
 return cy.contains('tr',ID).should('be.visible').then($fila=>{
  const celdas=[...$fila.find('td')].map(td=>(td.textContent||'').replace(/\s+/g,' ').trim());
  const texto=($fila.text()||'').replace(/\s+/g,' ').trim();
  return {
   id:celdas[0],
   variable:celdas[1],
   rango:celdas[2],
   niveles:[celdas[4],celdas[5],celdas[6]],
   estado:celdas[7],
   textoCompleto:texto,
  };
 });
}

function funcional(f:any){
 return JSON.stringify({id:f.id,rango:f.rango,niveles:f.niveles,estado:f.estado});
}

describe('TC-M09-G28 / TC-M09-61 — persistencia entre sesiones',()=>{
 it('la configuracion sigue disponible con los mismos valores tras una nueva sesion',()=>{
  const visto:any={};

  // ---------------- SESION A ----------------
  iniciarSesion('loginA');
  abrirUmbrales('umbralesA','variablesA');
  cy.contains('tr',ID).should('contain.text',RANGO).and('contain.text','Activo');
  leerFila().then(fila=>{visto.sesionA=fila;});
  cy.contains('tr',ID).screenshot('TC-M09-61-sesion-A-configuracion');

  // ---------------- FIN DE LA SESION A ----------------
  // Se usa el mecanismo real de la interfaz, no una manipulacion de tokens.
  cy.get('nav.ds-sidebar button.ds-sidebar__logout').should('be.visible').click();
  cy.location('pathname',{timeout:15000}).should('include','login');
  cy.get('input[type="email"]').should('be.visible');
  // Solo despues del logout: se descartan restos de sesion para que la sesion B
  // sea autentica y no una restauracion de la anterior.
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window().then(w=>w.sessionStorage.clear());
  cy.then(()=>{visto.logout={ruta:'/login',metodo:'boton Cerrar sesion de la barra lateral'};});

  // ---------------- SESION B ----------------
  iniciarSesion('loginB');
  abrirUmbrales('umbralesB','variablesB');
  cy.contains('tr',ID).should('contain.text',RANGO).and('contain.text','Activo');
  leerFila().then(fila=>{visto.sesionB=fila;});
  cy.contains('tr',ID).screenshot('TC-M09-61-sesion-B-persistencia');

  // ---------------- COMPARACION ----------------
  cy.then(()=>{
   expect(visto.sesionA.id,'sesion A leyo el registro').to.contain(String(REG.id_umbral_ambiental));
   expect(visto.sesionB.id,'sesion B leyo el registro').to.contain(String(REG.id_umbral_ambiental));
   expect(visto.sesionA.rango,'rango visible en sesion A').to.contain(RANGO);
   expect(visto.sesionB.rango,'rango visible en sesion B').to.contain(RANGO);
   expect(visto.sesionA.estado,'estado en sesion A').to.contain('Activo');
   expect(visto.sesionB.estado,'estado en sesion B').to.contain('Activo');
   expect(visto.sesionA.variable,'variable en sesion A').to.contain(REG.variable_nombre);
   expect(visto.sesionB.variable,'variable en sesion B').to.contain(REG.variable_nombre);
   expect(funcional(visto.sesionB),'mismos valores funcionales en ambas sesiones')
    .to.eq(funcional(visto.sesionA));
  });

  // Comprobacion por API con el token de la sesion B, sin escribir nada.
  cy.get('@umbralesB',{log:false}).then((interceptado:any)=>{
   const item=interceptado.response.body.items.find((u:any)=>u.id_umbral_ambiental===REG.id_umbral_ambiental);
   expect(item,'el GET de la sesion B devuelve el registro').to.not.be.undefined;
   expect(String(item.valor_min)).to.eq(String(REG.valor_min));
   expect(String(item.valor_max)).to.eq(String(REG.valor_max));
   expect(item.es_activo).to.eq(true);
   cy.task('evidencia',{...visto,apiSesionB:{
    id_umbral_ambiental:item.id_umbral_ambiental,id_especie:item.id_especie,
    id_variable_ambiental:item.id_variable_ambiental,
    valor_min:item.valor_min,valor_max:item.valor_max,es_activo:item.es_activo,
   },sinEscrituras:true},{log:false});
  });
 });
});
