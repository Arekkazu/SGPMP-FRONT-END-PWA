// Control "sin_circulos" de la prueba de la herramienta del reintento 1 de TC-M08-G024. No es parte de la corrida oficial.
// Dibuja cada punto de la línea como <rect> en lugar de <circle>: con ADAPT-1, CP-01 a CP-04 deben dar FALLA (0 puntos contados). CP-06 no lo detecta (limitación conocida: cuenta menos de 2.000 dibujados).
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const CAMBIOS: Array<[string, string]> = [
  [
    "<circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill=\"var(--brand-600, #2f5d3a)\">",
    "<rect key={p.index} x={p.cx} y={p.cy} width={3} height={3} fill=\"var(--brand-600, #2f5d3a)\">"
  ],
  [
    "                          </circle>\n                        )} />",
    "                          </rect>\n                        )} />"
  ]
];

function control(): Plugin {
  return {
    name: 'qa-g024-r1-sin_circulos',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let normCode = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of CAMBIOS) {
        const veces = normCode.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g024-r1-sin_circulos: texto viejo aparece ${veces} veces (se esperaba 1)`);
        normCode = normCode.replace(viejo, nuevo);
      }
      return { code: normCode, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [control()] });
