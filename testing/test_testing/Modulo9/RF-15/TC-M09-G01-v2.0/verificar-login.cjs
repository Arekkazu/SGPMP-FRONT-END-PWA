const axios = require('axios');
const { resolve } = require('path');
const { existsSync, readFileSync } = require('fs');

function cargarEnvTest() {
  const envPath = resolve(__dirname, '../../../../.env.test');
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
  console.error('Configure las variables de entorno o cree un archivo .env.test con las credenciales.');
  process.exit(1);
}

const loginUrl = `${apiUrl}/sesiones/`;

console.log(`Enviando POST a: ${loginUrl}`);

// El backend SGPMP exige 'correo_electronico' y 'contrasena'
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
      if (err.response.status === 401 || err.response.status === 400 || err.response.status === 403) {
        console.error('Diagnóstico:  Fallo de autenticación o credenciales inválidas (revisar correo y contraseña).');
      } else {
        console.error('Diagnóstico:  Error del servidor o ambiente backend.');
      }
    } else if (err.code) {
      console.error(`Error de red: ${err.code} - ${err.message}`);
      console.error('Diagnóstico:  Problema de conectividad, DNS o timeout de red con el host objetivo.');
    } else {
      console.error(`Error:        ${err.message}`);
    }
    process.exit(1);
  });
