// Control "umbral" de la prueba de la herramienta (TC-M08-G027). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  [
    'const [previa, setPrevia] = useState<VistaPrevia | null>(null);',
    'const [previa, setPrevia] = useState<VistaPrevia | null>(null);\n  const [estimadoMs, setEstimadoMs] = useState<number>(Infinity);',
  ],
  [
    'setPrevia(await reportesApi.vistaPrevia(reporte.tipo_reporte, valores));',
    'const vp = await reportesApi.vistaPrevia(reporte.tipo_reporte, valores); setPrevia(vp); setEstimadoMs(Number((vp as unknown as { tiempo_estimado_operacion?: number }).tiempo_estimado_operacion ?? Infinity));',
  ],
  [
    '{generando && (',
    '{generando && estimadoMs > 3000 && (',
  ],
];

function controlUmbral(): Plugin {
  return {
    name: 'qa-g027-control-umbral',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/reportes/pages/ReportesPage.tsx')) return null;
      let salida = code.replace(/\r\n/g, '\n');
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g027-control-umbral: "${viejo}" aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlUmbral()] });
