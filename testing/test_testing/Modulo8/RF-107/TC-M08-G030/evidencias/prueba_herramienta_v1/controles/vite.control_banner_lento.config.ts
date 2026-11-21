// Control "control_banner_lento" de la prueba de la herramienta (TC-M08-G030). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO_OK = "pushToast('success', t('historialpredictivo.exportado'));";
const NUEVO_OK = "setTimeout(() => pushToast('success', t('historialpredictivo.exportado')), 800);";
const VIEJO_ERR = "pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion });";
const NUEVO_ERR = "setTimeout(() => pushToast('error', t('historialpredictivo.no_exporto'), err.message, { accion: err.accion }), 800);";

function controlBannerLento(): Plugin {
  return {
    name: 'qa-g030-control-banner-lento',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const vecesOk = normCode.split(VIEJO_OK).length - 1;
      const vecesErr = normCode.split(VIEJO_ERR).length - 1;
      if (vecesOk !== 1) throw new Error(`qa-g030-control-banner-lento: VIEJO_OK aparece ${vecesOk} veces (se esperaba 1)`);
      if (vecesErr !== 1) throw new Error(`qa-g030-control-banner-lento: VIEJO_ERR aparece ${vecesErr} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO_OK, NUEVO_OK).replace(VIEJO_ERR, NUEVO_ERR), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlBannerLento()] });
