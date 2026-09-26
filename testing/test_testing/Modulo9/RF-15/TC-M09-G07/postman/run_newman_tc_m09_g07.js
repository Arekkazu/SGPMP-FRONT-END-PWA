const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Cargar variables desde .env.test
const envPath = path.resolve(__dirname, '..', '.env.test');
const envVars = {
  API_BASE_URL: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
  ADMIN_EMAIL: 'administador.dev@gmail.com',
  TEST_ADMIN_PASSWORD: 'Test1234!',
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
        envVars[k] = v;
      }
    }
  }
}

const collectionPath = path.join(__dirname, 'TC-M09-G07.postman_collection.json');
const evidenciasDir = path.join(__dirname, '..', 'evidencias');
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

process.exit(result.status || 0);
