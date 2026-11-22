// Control "sin_zoom" de la prueba de la herramienta del reintento 1 de TC-M08-G024. No es parte de la corrida oficial.
// Quita el grupo de botones de la línea de tiempo: CP-05 debe dar FALLA (botones_zoom=0) y el resto igual.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const CAMBIOS: Array<[string, string]> = [
  [
    "<div role=\"group\" aria-label={t('historialpredictivo.zoom_grupo')}",
    "{false && <div role=\"group\" aria-label={t('historialpredictivo.zoom_grupo')}"
  ],
  [
    "              </Button>\n            </div>\n            {visible && enZoom && (",
    "              </Button>\n            </div>}\n            {visible && enZoom && ("
  ]
];

function control(): Plugin {
  return {
    name: 'qa-g024-r1-sin_zoom',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let normCode = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of CAMBIOS) {
        const veces = normCode.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g024-r1-sin_zoom: texto viejo aparece ${veces} veces (se esperaba 1)`);
        normCode = normCode.replace(viejo, nuevo);
      }
      return { code: normCode, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [control()] });
