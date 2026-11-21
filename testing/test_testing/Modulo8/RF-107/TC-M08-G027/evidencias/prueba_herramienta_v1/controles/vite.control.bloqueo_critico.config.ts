// Control "bloqueo_critico" de la prueba de la herramienta (TC-M08-G027). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const C_VIEJO = 'const ejecutar = async () => {';
const C_NUEVO = 'const ejecutar = async () => { (window as unknown as Record<string, boolean>).__qaEnCurso = true;';

const CL_VIEJO = "onClick={() => { cambio.limpiar(); setEstado({ cliente: c, accion: 'revocar' }); }}";
const CL_NUEVO = "onClick={() => { if ((window as unknown as Record<string, boolean>).__qaEnCurso) { pushToast('info', 'Espera a que finalice el cierre del período antes de continuar.'); return; } cambio.limpiar(); setEstado({ cliente: c, accion: 'revocar' }); }}";

function controlBloqueoCritico(): Plugin {
  return {
    name: 'qa-g027-control-bloqueo-critico',
    enforce: 'pre',
    transform(code, id) {
      const ruta = id.replace(/\\/g, '/').split('?')[0];
      if (ruta.endsWith('src/financial_valuation/pages/CierreView.tsx')) {
        const salida = code.replace(/\r\n/g, '\n');
        const veces = salida.split(C_VIEJO).length - 1;
        if (veces !== 1) throw new Error(`qa-g027-control-bloqueo-critico (CierreView): aparece ${veces} veces`);
        return { code: salida.replace(C_VIEJO, C_NUEVO), map: null };
      }
      if (ruta.endsWith('src/accounting_integration/pages/ClientesView.tsx')) {
        const salida = code.replace(/\r\n/g, '\n');
        const veces = salida.split(CL_VIEJO).length - 1;
        if (veces !== 1) throw new Error(`qa-g027-control-bloqueo-critico (ClientesView): aparece ${veces} veces`);
        return { code: salida.replace(CL_VIEJO, CL_NUEVO), map: null };
      }
      return null;
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlBloqueoCritico()] });
