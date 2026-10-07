const axios = require('axios');
const { resolve } = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
  ];
  for (const envPath of rutas) {
    if (existsSync(envPath)) {
      try {
        const lineas = readFileSync(envPath, 'utf8').split('\n');
        for (const l of lineas) {
          const linea = l.trim();
          if (linea && !linea.startsWith('#')) {
            const idx = linea.indexOf('=');
            if (idx !== -1) {
              const key = linea.substring(0, idx).trim();
              const val = linea.substring(idx + 1).trim();
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        }
      } catch (_) {}
    }
  }
}

cargarEnvTest();

const target = (process.env.ENV_TARGET || 'TEST').toUpperCase();
const apiUrl =
  process.env.CYPRESS_API_BASE_URL ||
  (target === 'DEV' ? 'https://api.inmero.co/back-sigab-dev' : 'https://api.inmero.co/back-sigab-test');

const email = process.env.ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

const logLines = [];
function log(msg) {
  console.log(msg);
  logLines.push(msg);
}

async function restaurar() {
  log('=== RESTAURACIÓN MANUAL DE ESPECIE ID 4 ===');
  log(`API:     ${apiUrl}`);
  log(`Usuario: ${email}`);

  // 1. POST /sesiones/
  log('1. Autenticando vía POST /sesiones/...');
  const loginRes = await axios.post(`${apiUrl}/sesiones/`, {
    correo_electronico: email,
    contrasena: password,
  });
  log(`Login status: HTTP ${loginRes.status}`);
  const token = loginRes.data.token || loginRes.data.access_token || (loginRes.data.data && loginRes.data.data.token);
  if (!token) throw new Error('No se obtuvo token en login');

  const headers = { Authorization: `Bearer ${token}` };

  // 2. GET /configuracion/especies?solo_activas=false
  log('2. Consultando especie ID 4 previa...');
  const getResPre = await axios.get(`${apiUrl}/configuracion/especies?solo_activas=false`, { headers });
  log(`GET especies status: HTTP ${getResPre.status}`);
  const listaPre = Array.isArray(getResPre.data) ? getResPre.data : (getResPre.data.items || getResPre.data.data);
  const espPre = listaPre.find((x) => x.id_especie === 4);
  log(`Estado previo ID 4: ${JSON.stringify(espPre, null, 2)}`);

  const fechaActPrevia = espPre.fecha_actualizacion || espPre.fecha_actualizacion_especie;

  // 4. PATCH /configuracion/especies/4
  log('3. Enviando PATCH de reversión a "Cachama Blanca"...');
  const patchRes = await axios.patch(
    `${apiUrl}/configuracion/especies/4`,
    {
      nombre: 'Cachama Blanca',
      descripcion: 'Restaurado tras prueba',
      fecha_actualizacion: fechaActPrevia,
    },
    { headers }
  );
  log(`PATCH status: HTTP ${patchRes.status}`);

  // 5. GET para confirmar
  log('4. Verificando estado post-restauración...');
  const getResPost = await axios.get(`${apiUrl}/configuracion/especies?solo_activas=false`, { headers });
  log(`GET confirmación status: HTTP ${getResPost.status}`);
  const listaPost = Array.isArray(getResPost.data) ? getResPost.data : (getResPost.data.items || getResPost.data.data);
  const espPost = listaPost.find((x) => x.id_especie === 4);
  log(`Estado final verificado ID 4: ${JSON.stringify(espPost, null, 2)}`);

  const ok = espPost.nombre === 'Cachama Blanca' && espPost.descripcion === 'Restaurado tras prueba';
  log(`Veredicto restauración: ${ok ? 'EXITOSO' : 'FALLIDO'}`);

  writeFileSync(
    resolve(__dirname, 'evidencias/restauracion_id4.txt'),
    logLines.join('\n'),
    'utf8'
  );
}

restaurar().catch((err) => {
  log(`ERROR en restauración: ${err.response ? JSON.stringify(err.response.data) : err.message}`);
  writeFileSync(
    resolve(__dirname, 'evidencias/restauracion_id4.txt'),
    logLines.join('\n'),
    'utf8'
  );
  process.exit(1);
});
