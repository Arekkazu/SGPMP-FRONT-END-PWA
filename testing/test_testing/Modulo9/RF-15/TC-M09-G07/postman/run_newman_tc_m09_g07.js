const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Cargar variables desde .env.test
const envPath = path.resolve(__dirname, '..', '.env.test');
const envVars = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://api.inmero.co/back-sigab-test',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD,
};

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (!envVars[k]) envVars[k] = v;
      }
    }
  }
}

if (!envVars.ADMIN_EMAIL || !envVars.TEST_ADMIN_PASSWORD) {
  console.error('ERROR R5: Faltan variables obligatorias ADMIN_EMAIL y/o TEST_ADMIN_PASSWORD en el entorno (.env.test).');
  process.exit(1);
}

const collectionPath = path.join(__dirname, 'TC-M09-G07.postman_collection.json');
const evidenciasDir = path.join(__dirname, '..', 'evidencias', 'v4-reeval-20261003');
const outJsonPath = path.join(evidenciasDir, 'TC-M09-G07_postman_resultado.json');

if (!fs.existsSync(evidenciasDir)) {
  fs.mkdirSync(evidenciasDir, { recursive: true });
}

console.log('=== EJECUTANDO COLECCIÓN POSTMAN TC-M09-G07 VÍA NEWMAN CLI ===');
console.log('Ambiente:', envVars.API_BASE_URL);
console.log('Colección:', collectionPath);

const args = [
  'newman',
  'run',
  collectionPath,
  '--env-var', `API_BASE_URL=${envVars.API_BASE_URL}`,
  '--env-var', `ADMIN_EMAIL=${envVars.ADMIN_EMAIL}`,
  '--env-var', `TEST_ADMIN_PASSWORD=${envVars.TEST_ADMIN_PASSWORD}`,
  '--reporters', 'cli,json',
  '--reporter-json-export', outJsonPath,
];

const isWin = process.platform === 'win32';
const cmd = isWin ? 'npx.cmd' : 'npx';

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: isWin,
});

if (result.error) {
  console.error('Error al invocar newman:', result.error);
  process.exit(1);
}

// Saneamiento de dump JSON (R5)
if (fs.existsSync(outJsonPath)) {
  try {
    let raw = fs.readFileSync(outJsonPath, 'utf8');
    raw = raw.replace(/"contrasena":\s*"[^"]+"/g, '"contrasena": "***"');
    raw = raw.replace(/"value":\s*"[^"]+"/g, (match) => {
      if (match.includes(envVars.TEST_ADMIN_PASSWORD)) return '"value": "***"';
      return match;
    });
    raw = raw.replace(/"token":\s*"[^"]+"/g, '"token": "***"');
    fs.writeFileSync(outJsonPath, raw, 'utf8');
    console.log('  [run_newman] Dump saneado correctamente (R5).');
  } catch (err) {
    console.warn('  [run_newman] Advertencia al sanear dump:', err.message);
  }
}

process.exit(result.status || 0);
