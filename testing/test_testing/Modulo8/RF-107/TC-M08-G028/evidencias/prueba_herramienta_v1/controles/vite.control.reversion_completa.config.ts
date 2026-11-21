// Control "reversion_completa" de la prueba de la herramienta (TC-M08-G028). No es parte de la corrida oficial.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = `titulo={t('valor.revertir_titulo')} descripcion={t('valor.revertir_ayuda')} etiqueta={t('valor.motivo')} confirmar={t('valor.revertir')}`;
const NUEVO = `titulo={t('valor.revertir_titulo')} descripcion={\`\${t('valor.revertir_ayuda')} Activo \${identificador}. La reversión es definitiva: no se puede deshacer.\`} etiqueta={t('valor.motivo')} confirmar={t('valor.revertir')}`;

function controlReversionCompleta(): Plugin {
  return {
    name: 'qa-g028-control-reversion-completa',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/financial_valuation/components/DetalleActivoModal.tsx')) return null;
      const salida = code.replace(/\r\n/g, '\n');
      const veces = salida.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g028-control-reversion-completa: patron aparece ${veces} veces (se esperaba 1)`);
      return { code: salida.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlReversionCompleta()] });
