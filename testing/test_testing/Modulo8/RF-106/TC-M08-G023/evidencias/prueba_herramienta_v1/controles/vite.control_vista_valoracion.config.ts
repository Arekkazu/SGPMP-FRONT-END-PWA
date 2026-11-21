// Control "control_vista_valoracion" de la prueba de la herramienta (TC-M08-G023). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = "<h3 style={{ margin: '0 0 var(--s2)' }}>{t('historialpredictivo.pendientes_titulo')}</h3>";
const NUEVO = "<h3 style={{ margin: '0 0 var(--s2)' }}>{t('historialpredictivo.pendientes_titulo')}</h3><div role=\"radiogroup\" aria-label=\"Valoración\"><button type=\"button\" role=\"radio\" aria-checked=\"false\">Correcto</button></div>";

function controlVistaValoracion(): Plugin {
  return {
    name: 'qa-g023-control-vista-valoracion',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g023-control-vista-valoracion: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlVistaValoracion()] });
