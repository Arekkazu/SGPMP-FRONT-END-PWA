// Control "indicador_pegado" de la prueba de la herramienta (TC-M08-G027). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = '    } finally {\n      setGenerando(false);\n    }';
const NUEVO = '    } finally {\n      /* QA: indicador_pegado */\n    }';

function controlIndicadorPegado(): Plugin {
  return {
    name: 'qa-g027-control-indicador-pegado',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/reportes/pages/ReportesPage.tsx')) return null;
      const salida = code.replace(/\r\n/g, '\n');
      const veces = salida.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g027-control-indicador-pegado: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: salida.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlIndicadorPegado()] });
