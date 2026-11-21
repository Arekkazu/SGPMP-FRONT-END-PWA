// Control "control_lento" de la prueba de la herramienta (TC-M08-G024). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = '}).then((d) => { if (vivo) setDatos(d); })';
const NUEVO = '}).then((d) => { const qa0 = Date.now(); let qaN = 0; while (Date.now() - qa0 < 3500) { qaN += 1; } (window as unknown as Record<string, number>).__qaLento = qaN; if (vivo) setDatos(d); })';

function controlLento(): Plugin {
  return {
    name: 'qa-g024-control-lento',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g024-control-lento: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlLento()] });
