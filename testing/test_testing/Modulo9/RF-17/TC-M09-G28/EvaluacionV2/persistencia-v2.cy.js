// All intercepts are passive. Real UI logins; no cy.session or response stubs.
Cypress.Screenshot.defaults({blackout:['input[type="password"]','input[type="email"]'],capture:'viewport'});
const R=Cypress.env('record');
const evidence={};
let oldToken;
function login(alias){
 cy.intercept('POST','**/sesiones/').as(alias);
 cy.visit('/login');
 cy.get('input[type="email"]').type(Cypress.env('email'),{log:false});
 cy.get('input[type="password"]').type(Cypress.env('password'),{log:false});
 cy.get('button[type="submit"]').click();
 cy.wait('@'+alias,{log:false}).then(({response})=>{
  expect(response.statusCode).eq(200);
  const token=response.body.token;
  expect(Boolean(token),'token issued').eq(true);
  if(oldToken){expect(token!==oldToken,'new token differs').eq(true);evidence.new_token_confirmed=true;oldToken=undefined;}
  else oldToken=token;
  cy.request({url:Cypress.env('api')+'/usuarios/me',headers:{Authorization:'Bearer '+token},log:false}).then(({body})=>{
   expect(body.correo_electronico).eq(Cypress.env('email'));
   expect(['Administrador','Administrador del sistema','Veterinario']).include(body.nombre_rol);
   evidence[alias]={authentication_successful:true,actor:{id_usuario:body.id_usuario,nombre_rol:body.nombre_rol}};
  });
 });
 cy.location('pathname').should('not.include','login');
}
function row(){return cy.contains('td',new RegExp('^#'+R.id_umbral_ambiental+'$')).parent('tr');}
function normalized(r){return {id:r.id_umbral_ambiental,species:r.id_especie,variable:r.id_variable_ambiental,min:Number(r.valor_min),max:Number(r.valor_max),active:r.es_activo,levels:r.niveles.map(n=>[n.nivel,Number(n.limite_inferior),Number(n.limite_superior)]).sort()};}
function open(alias){
 cy.intercept('GET','**/configuracion/variables-ambientales*').as('vars'+alias);
 cy.intercept('GET','**/configuracion/umbrales?*').as('get'+alias);
 cy.contains('nav.ds-sidebar button',/^Configuración$/).should('have.attr','aria-disabled','false').click();
 cy.location('pathname').should('eq','/configuracion');
 cy.contains('button',/^Por especie$/i).click();
 cy.contains('button',R.especie_nombre).click();
 cy.contains('button','Umbrales Ambientales').click();
 cy.wait('@get'+alias,{log:false}).then(({response})=>{
  expect(response.statusCode).eq(200);
  const matches=response.body.items.filter(r=>r.id_umbral_ambiental===R.id_umbral_ambiental);
  expect(matches.length).eq(1);
  expect(normalized(matches[0])).deep.eq(normalized(R));
  evidence[alias==='B'?'api_after_session':'api_before_logout']=matches[0];
 });
 cy.wait('@vars'+alias,{log:false}).its('response.statusCode').should('eq',200);
 row().should('be.visible').and('contain.text',R.variable_nombre).and('contain.text','Activo');
 row().find('td').then(cells=>{
  const values=[...cells].map(c=>c.textContent.replace(/\s+/g,' ').trim());
  const numbers=s=>(s.match(/-?\d+(?:[.,]\d+)?/g)||[]).map(x=>Number(x.replace(',','.')));
  expect(numbers(values[2]),'visible range').deep.eq([Number(R.valor_min),Number(R.valor_max)]);
  ['normal','precaucion','critico'].forEach((name,i)=>{
   const level=R.niveles.find(n=>n.nivel===name);
   expect(numbers(values[4+i]),'visible '+name).deep.eq([Number(level.limite_inferior),Number(level.limite_superior)]);
  });
  evidence['ui'+alias]={id:values[0],variable:values[1],range:values[2],levels:values.slice(4,7),active:values[7],species:R.especie_nombre};
 });
 cy.screenshot(alias==='B'?'TC-M09-61-despues-nueva-sesion':'TC-M09-60-configuracion-visible',{capture:'fullPage'});
 cy.then(()=>cy.task('evidence',evidence,{log:false}));
}
describe('TC-M09-G28 V2',()=>{
 it('same configuration and exact values survive a real new session',()=>{
  login('loginA');open('A');
  cy.intercept('DELETE','**/sesiones/').as('logout');
  cy.get('nav.ds-sidebar button.ds-sidebar__logout').click();
  cy.wait('@logout',{log:false}).its('response.statusCode').should('eq',200);
  cy.location('pathname').should('include','login');
  cy.clearCookies({log:false});cy.clearLocalStorage({log:false});
  cy.window({log:false}).then(w=>w.sessionStorage.clear());
  cy.then(()=>{evidence.logout_confirmed=true;});
  login('loginB');open('B');
  cy.then(()=>{expect(evidence.uiB).deep.eq(evidence.uiA);cy.task('evidence',evidence,{log:false});});
  cy.get('nav.ds-sidebar button.ds-sidebar__logout').click();
  cy.location('pathname').should('include','login');
 });
});
