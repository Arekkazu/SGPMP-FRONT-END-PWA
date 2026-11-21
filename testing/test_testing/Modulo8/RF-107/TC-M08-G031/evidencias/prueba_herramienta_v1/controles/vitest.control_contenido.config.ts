// Control "control_contenido" de la prueba de la herramienta (TC-M08-G031). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = '<div className="ds-scroll-region"';
const NUEVO = "{estado === 'OFFLINE' && <p>Sin conexión hace 5 min. Datos en caché: Activos biológicos. En cola: registrar_evento, registrar_crecimiento</p>}{estado === 'CONFLICTO' && <p>Local: Lote QA 1 · Servidor: Lote QA 2 · Desde: 2026-11-21 14:30</p>}<div className=\"ds-scroll-region\"";

function controlContenido(): Plugin {
  return {
    name: 'qa-g031-control-contenido',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/shared/design-system/EstadoSincronizacion.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g031-control-contenido: texto viejo aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlContenido()] });
