// TEST real. Los intercept solo observan trafico; ninguna respuesta se sustituye.
// Cypress verifica visualmente lo que Newman creo. Si Newman no creo el registro,
// documenta el estado observable SIN emitir ningun POST: no es un intento extra.
Cypress.Screenshot.defaults({blackout:['input[type="password"]','input[type="email"]'],capture:'viewport'});

const CASO=Cypress.env('caso') as string;
const EV=Cypress.env('evidencia') as any;
const ID=EV.idCreado;

describe('TC-M09-G22 — configuraciones ambientales validas',()=>{
 it(`${CASO} — evidencia visual`,()=>{
  const observado:any={caso:CASO,idCreadoPorNewman:ID,statusNewman:EV.status};
  const posts:any[]=[];

  cy.intercept('POST','**/sesiones/').as('login');
  cy.visit('/login');
  cy.get('input[type="email"]').type(Cypress.env('email'),{log:false});
  cy.get('input[type="password"]').type(Cypress.env('password'),{log:false});
  cy.get('button[type="submit"]').click();
  cy.wait('@login',{log:false}).its('response.statusCode').should('eq',200);
  cy.location('pathname').should('not.include','login');

  // Se observa cualquier POST de umbral: este recorrido no debe emitir ninguno.
  cy.intercept('POST','**/configuracion/umbrales',req=>{
   req.continue(res=>{posts.push({status:res.statusCode,payload:req.body});});
  }).as('crear');

  // El catalogo de variables se intercepta antes de navegar: la tabla resuelve con
  // el el nombre de la variable y sin esperarlo puede mostrar el marcador "Variable #N".
  cy.intercept('GET','**/configuracion/variables-ambientales*').as('variables');
  cy.contains('nav.ds-sidebar button',/^Configuración$/).should('have.attr','aria-disabled','false').click();
  cy.location('pathname').should('eq','/configuracion');
  cy.contains('button',/^Por especie$/i).click();
  cy.then(()=>cy.contains('button',EV.especie.nombre).click());
  cy.intercept('GET','**/configuracion/umbrales?*').as('umbrales');
  cy.contains('button','Umbrales Ambientales').click();
  cy.wait('@umbrales',{log:false}).its('response.statusCode').should('eq',200);
  cy.wait('@variables',{log:false}).its('response.statusCode').should('eq',200);

  if(ID){
   // Verificacion visual del registro creado por Newman.
   cy.contains('tr',`#${ID}`).as('fila').should('be.visible');
   cy.get('@fila').should('contain.text',EV.variable.nombre)
     .and('contain.text',`${Number(EV.payload.valor_min).toFixed(2)} – ${Number(EV.payload.valor_max).toFixed(2)}`)
     .and('contain.text','Activo');
   cy.get('@fila').invoke('text').then(t=>{observado.filaVisible=String(t).replace(/\s+/g,' ').trim();});
   cy.screenshot(`${CASO}-configuracion-visible`);
   cy.get('@fila').screenshot(`${CASO}-detalle-umbral`);
  }else{
   // Newman no creo el registro: se documenta el estado observable, sin escribir.
   cy.get('table').should('exist').and('not.contain.text',EV.variable.nombre);
   cy.get('table').invoke('text').then(t=>{observado.tablaVisible=String(t).replace(/\s+/g,' ').trim().slice(0,400);});
   cy.screenshot(`${CASO}-sin-registro`);
   cy.get('table').screenshot(`${CASO}-tabla-especie`);
  }

  // Comprobacion por API con el token de la sesion, sin escribir nada.
  cy.get('@umbrales',{log:false}).then((interceptado:any)=>{
   const items=interceptado.response.body.items||[];
   const deLaVariable=items.filter((u:any)=>u.id_variable_ambiental===EV.variable.id);
   observado.apiUmbralesDeLaVariable=deLaVariable.map((u:any)=>({id:u.id_umbral_ambiental,
    valor_min:u.valor_min,valor_max:u.valor_max,es_activo:u.es_activo}));
   expect(deLaVariable.length,ID?'el registro creado debe estar':'no debe existir registro de la combinacion')
    .to.eq(ID?1:0);
  });

  cy.get('@crear.all',{log:false}).then((requests:any)=>{
   observado.postsDeUmbralEmitidos=requests.length;
   expect(requests.length,'Cypress no emite POST de umbral').to.eq(0);
   cy.task('evidenciaUi',{...observado,posts},{log:false});
  });
 });
});
