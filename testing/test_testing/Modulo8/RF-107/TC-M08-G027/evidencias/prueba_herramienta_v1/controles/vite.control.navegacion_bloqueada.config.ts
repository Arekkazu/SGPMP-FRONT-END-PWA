// Control "navegacion_bloqueada" de la prueba de la herramienta (TC-M08-G027). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  [
    'const id = periodo.id_periodo_contable;',
    'const id = periodo.id_periodo_contable; const navQa = useHistory();',
  ],
  [
    '  useEffect(() => {\n    if (!cierre.cargando) { setPaso(null); return; }',
    '  useEffect(() => { if (!cierre.cargando) return; return navQa.block(() => false); }, [cierre.cargando, navQa]);\n  useEffect(() => {\n    if (!cierre.cargando) { setPaso(null); return; }',
  ],
];

function controlNavegacionBloqueada(): Plugin {
  return {
    name: 'qa-g027-control-navegacion-bloqueada',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/financial_valuation/pages/CierreView.tsx')) return null;
      let salida = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g027-control-navegacion-bloqueada: "${viejo}" aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlNavegacionBloqueada()] });
