// Control "control_fecha_iso" de la prueba de la herramienta (TC-M08-G031). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = '`${formatearFecha(new Date(m.ultimo))} ${formatearHora(new Date(m.ultimo))}`';
const NUEVO = "new Date(m.ultimo).toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).slice(0, 16)";

function controlFechaIso(): Plugin {
  return {
    name: 'qa-g031-control-fecha-iso',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/shared/design-system/EstadoSincronizacion.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g031-control-fecha-iso: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlFechaIso()] });
