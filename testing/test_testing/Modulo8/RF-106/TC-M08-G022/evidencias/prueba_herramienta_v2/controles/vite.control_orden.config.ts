// Control "vitest_vista_orden" de la prueba de la herramienta (TC-M08-G022). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  ['datos.pendientes.items.map(', '[...datos.pendientes.items].reverse().map('],
];

function vistaControl(): Plugin {
  return {
    name: 'qa-g022-vista-orden',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let salida = code;
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g022-vista-orden: "${viejo}" aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [vistaControl()] });
