const axios = require('axios');
const { resolve } = require('path');
const { existsSync, readFileSync } = require('fs');

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
    resolve(__dirname, '../../../../../.env.test'),
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

console.log('=== VERIFICACIÓN DE LOGIN (Único intento) ===');
console.log(`Ambiente API: ${apiUrl}`);
console.log(`Usuario:      ${email ? email : '(NO DEFINIDO)'}`);

if (!email || !password) {
  console.error('ERROR: Faltan credenciales en variables de entorno (ADMIN_EMAIL o TEST_ADMIN_PASSWORD).');
  process.exit(1);
}

const loginUrl = `${apiUrl}/sesiones/`;
console.log(`Enviando POST a: ${loginUrl}`);

axios
  .post(
    loginUrl,
    {
      correo_electronico: email,
      contrasena: password,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    }
  )
  .then((response) => {
    console.log(`\nRESULTADO: Éxito (HTTP ${response.status})`);
    const data = response.data;
    const token = data.token || data.access_token || (data.data && data.data.token);
    if (token) {
      console.log('Token recibido correctamente (Bearer en memoria verificado).');
    } else {
      console.log('Respuesta recibida correctamente.');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nRESULTADO: Fallo en login.');
    if (err.response) {
      console.error(`HTTP Status:  ${err.response.status}`);
      console.error(`Respuesta:    ${JSON.stringify(err.response.data)}`);
    } else if (err.code) {
      console.error(`Error de red: ${err.code} - ${err.message}`);
    } else {
      console.error(`Error:        ${err.message}`);
    }
    process.exit(1);
  });
