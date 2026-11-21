// Control "control_cache" de la prueba de la herramienta (TC-M08-G023). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO_1 = 'export function HistorialPredictivoView() {';
const NUEVO_1 = 'let cacheQA: HistorialPredictivo | null = null;\nexport function HistorialPredictivoView() {';
const VIEJO_2 = '}).then((d) => { if (vivo) setDatos(d); })';
const NUEVO_2 = '}).then((d) => { if (vivo) { setDatos(cacheQA ?? d); cacheQA = cacheQA ?? d; } })';

function controlCache(): Plugin {
  return {
    name: 'qa-g023-control-cache',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const v1 = normCode.split(VIEJO_1).length - 1;
      const v2 = normCode.split(VIEJO_2).length - 1;
      if (v1 !== 1) throw new Error(`qa-g023-control-cache: texto viejo 1 aparece ${v1} veces (se esperaba 1)`);
      if (v2 !== 1) throw new Error(`qa-g023-control-cache: texto viejo 2 aparece ${v2} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO_1, NUEVO_1).replace(VIEJO_2, NUEVO_2), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlCache()] });
