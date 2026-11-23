// Lanza servidor_api_simulada.mjs.txt como modulo ESM con los argumentos recibidos.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const codigo = readFileSync(join(aqui, 'servidor_api_simulada.mjs.txt'), 'utf8');
await import(`data:text/javascript;base64,${Buffer.from(codigo, 'utf8').toString('base64')}`);
