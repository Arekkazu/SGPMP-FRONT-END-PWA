// Control "revocar_directo" de la prueba de la herramienta (TC-M08-G028). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = `{!revocado && puedeRevocar && <Button variant="ghost" size="sm" onClick={() => { cambio.limpiar(); setEstado({ cliente: c, accion: 'revocar' }); }} aria-label={t('clientes.revocar_aria', { cliente: c.nombre })}><XCircle size={14} aria-hidden /></Button>}`;
const NUEVO = `{!revocado && puedeRevocar && <Button variant="ghost" size="sm" onClick={() => { void cambio.ejecutar(c.id_cliente_externo, 'revocar', 'Revocacion directa'); }} aria-label={t('clientes.revocar_aria', { cliente: c.nombre })}><XCircle size={14} aria-hidden /></Button>}`;

function controlRevocarDirecto(): Plugin {
  return {
    name: 'qa-g028-control-revocar-directo',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/accounting_integration/pages/ClientesView.tsx')) return null;
      const salida = code.replace(/\r\n/g, '\n');
      const veces = salida.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g028-control-revocar-directo: patron aparece ${veces} veces (se esperaba 1)`);
      return { code: salida.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlRevocarDirecto()] });
