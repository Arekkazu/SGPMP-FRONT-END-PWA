// Control "sin_muestreo" de la prueba de la herramienta del reintento 1 de TC-M08-G024. No es parte de la corrida oficial.
// Sube el límite de marcadores a 1.000.000: con 2.000 se dibujan todos y CP-06 debe dar FALLA (2000 de 2000); el resto igual.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const CAMBIOS: Array<[string, string]> = [
  [
    "export const LIMITE_MARCADORES = 1000;",
    "export const LIMITE_MARCADORES = 1_000_000;"
  ]
];

function control(): Plugin {
  return {
    name: 'qa-g024-r1-sin_muestreo',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let normCode = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of CAMBIOS) {
        const veces = normCode.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g024-r1-sin_muestreo: texto viejo aparece ${veces} veces (se esperaba 1)`);
        normCode = normCode.replace(viejo, nuevo);
      }
      return { code: normCode, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [control()] });
