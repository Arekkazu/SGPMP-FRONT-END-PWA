// Control "lento" de la prueba de la herramienta del reintento 1 de TC-M08-G024. No es parte de la corrida oficial.
// Retiene 3.500 ms la respuesta antes de dibujarla (contador observable para que el minificador no quite el bucle): CP-01 a CP-04 deben dar FALLA con tiempos > 3.000 ms.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const CAMBIOS: Array<[string, string]> = [
  [
    "}).then((d) => { if (vivo) setDatos(d); })",
    "}).then((d) => { const qa0 = Date.now(); let qaN = 0; while (Date.now() - qa0 < 3500) { qaN += 1; } (window as unknown as Record<string, number>).__qaLento = qaN; if (vivo) setDatos(d); })"
  ]
];

function control(): Plugin {
  return {
    name: 'qa-g024-r1-lento',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let normCode = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of CAMBIOS) {
        const veces = normCode.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g024-r1-lento: texto viejo aparece ${veces} veces (se esperaba 1)`);
        normCode = normCode.replace(viejo, nuevo);
      }
      return { code: normCode, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [control()] });
