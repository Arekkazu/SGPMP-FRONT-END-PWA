// Control "cierre_no_bloqueante" de la prueba de la herramienta (TC-M08-G028). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = `<ModalShell bloqueante title={t('cierre.confirmar_titulo', { periodo: nombrePeriodo(periodo) })} onClose={() => setConfirmando(false)} maxWidth={480}`;
const NUEVO = `<ModalShell title={t('cierre.confirmar_titulo', { periodo: nombrePeriodo(periodo) })} onClose={() => setConfirmando(false)} maxWidth={480}`;

function controlCierreNoBloqueante(): Plugin {
  return {
    name: 'qa-g028-control-cierre-no-bloqueante',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/financial_valuation/pages/CierreView.tsx')) return null;
      const salida = code.replace(/\r\n/g, '\n');
      const veces = salida.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g028-control-cierre-no-bloqueante: patron aparece ${veces} veces (se esperaba 1)`);
      return { code: salida.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlCierreNoBloqueante()] });
