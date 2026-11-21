// Control "tooltip" de la prueba de la herramienta (TC-M08-G027). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  [
    '<Button variant="primary" size="lg" loading={cierre.cargando} disabled={faltaAutorizar} onClick={() => setConfirmando(true)}>',
    '<Button variant="primary" size="lg" loading={cierre.cargando} disabled={faltaAutorizar} title={cierre.cargando ? \'Espera a que finalice el cierre del período antes de continuar.\' : undefined} onClick={() => setConfirmando(true)}>',
  ],
  [
    '<Button variant="secondary" size="lg" disabled={cierre.cargando} onClick={() => {',
    '<Button variant="secondary" size="lg" disabled={cierre.cargando} title={cierre.cargando ? \'Espera a que finalice el cierre del período antes de continuar.\' : undefined} onClick={() => {',
  ],
];

function controlTooltip(): Plugin {
  return {
    name: 'qa-g027-control-tooltip',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/financial_valuation/pages/CierreView.tsx')) return null;
      let salida = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g027-control-tooltip: "${viejo}" aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlTooltip()] });
