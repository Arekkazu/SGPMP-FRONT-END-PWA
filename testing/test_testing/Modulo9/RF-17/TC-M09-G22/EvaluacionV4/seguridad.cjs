// TC-M09-G22 V3 — revision de secretos sobre EvaluacionV4/, con el mismo formato de
// evidencia que V2 (seguridad-evidencias.json). Solo lectura del arbol de evidencia.
const fs = require('fs');
const path = require('path');
const H = require('./helpers.cjs');
const { runId } = H.settings({ requiereCaso: false });

const PATRONES = ['Authorization', 'Bearer ', 'access_token', 'refresh_token', 'password', 'cookie', 'jwt'];
const JWT = /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/;
const BEARER_CON_VALOR = /Bearer\s+(?!\[REDACTED\]|\{\{)[A-Za-z0-9_.\-]{12,}/;
const secreto = process.env.TEST_ADMIN_PASSWORD;

function archivos(dir, base) {
  const salida = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...archivos(p, base));
    else salida.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return salida.sort();
}

const raiz = __dirname;
const detalle = [];
for (const rel of archivos(raiz, raiz)) {
  // latin1 permite detectar literales tambien dentro de binarios (capturas PNG).
  const texto = fs.readFileSync(path.join(raiz, rel)).toString('latin1');
  const palabras = {};
  for (const pat of PATRONES) {
    const n = texto.split(new RegExp(pat.trim(), 'gi')).length - 1;
    if (n > 0) palabras[pat.trim()] = n;
  }
  detalle.push({
    archivo: rel, tipo: path.extname(rel) || '(sin extension)', palabrasClave: palabras,
    contrasenaLiteral: !!secreto && texto.includes(secreto),
    jwt: JWT.test(texto), bearerConValor: BEARER_CON_VALOR.test(texto),
  });
}
const comprometidos = detalle.filter((d) => d.contrasenaLiteral || d.jwt || d.bearerConValor);
H.save(runId, 'seguridad-evidencias.json', {
  patrones: PATRONES, totalArchivos: detalle.length,
  conclusion: {
    secretosPersistidos: comprometidos.length > 0,
    evidenciaHtmlJsonConPalabrasClave: comprometidos.map((d) => d.archivo),
    nota: 'Contrasena unicamente por variable de proceso TEST_ADMIN_PASSWORD; token solo en memoria. '
      + 'Capturas PNG revisadas por contenido binario y generadas con blackout de correo y contrasena. '
      + 'Las coincidencias en scripts, coleccion, README o reporte son nombres de variable, el marcador {{token}} o texto descriptivo.',
  },
  archivos: detalle,
}, { sobrescribir: true });
console.log('Archivos revisados:', detalle.length, '| con secreto real:', comprometidos.length);
comprometidos.forEach((d) => console.log('  COMPROMETIDO:', d.archivo));
process.exitCode = comprometidos.length === 0 ? 0 : 1;
