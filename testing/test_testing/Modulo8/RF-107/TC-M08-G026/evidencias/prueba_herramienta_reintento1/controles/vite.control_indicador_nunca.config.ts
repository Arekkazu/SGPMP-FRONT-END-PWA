// Control "indicador_nunca" de la prueba de la herramienta del reintento 1 de TC-M08-G026. No es parte de la corrida oficial.
// El indicador de proceso no aparece en 60 s: CP-09 debe dar FALLA con lo medido (no «No alcanzado»); OBS-3 lo registra.
// Uso: vitest run --config <este archivo> <spec>   o   vite build --config <este archivo> --outDir <dir>
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

// [archivo de src (sufijo), texto viejo (debe aparecer una vez), texto nuevo]
const CAMBIOS: Array<[string, string, string]> = [
  [
    "src/shared/design-system/ProcesoEnCurso.tsx",
    "setTimeout(() => setVisible(true), UMBRAL_PROCESO_MS + 1)",
    "setTimeout(() => setVisible(true), UMBRAL_PROCESO_MS + 60_001)"
  ]
];

function control(): Plugin {
  return {
    name: 'qa-g026-r1-indicador_nunca',
    enforce: 'pre',
    transform(code, id) {
      const ruta = id.replace(/\\/g, '/').split('?')[0];
      const mios = CAMBIOS.filter(([archivo]) => ruta.endsWith(archivo));
      if (!mios.length) return null;
      let normCode = code.replace(/\r\n/g, '\n');
      for (const [, viejo, nuevo] of mios) {
        const veces = normCode.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g026-r1-indicador_nunca: texto viejo aparece ${veces} veces en ${ruta} (se esperaba 1)`);
        normCode = normCode.replace(viejo, nuevo);
      }
      return { code: normCode, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [control()] });
