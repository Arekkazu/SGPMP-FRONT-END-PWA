// Control "control_cierre_escape" de la prueba de la herramienta (TC-M08-G030). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = "<ModalShell bloqueante title={t('cierre.confirmar_titulo'";
const NUEVO = "<ModalShell title={t('cierre.confirmar_titulo'";

function controlCierreEscape(): Plugin {
  return {
    name: 'qa-g030-control-cierre-escape',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/financial_valuation/pages/CierreView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g030-control-cierre-escape: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlCierreEscape()] });
