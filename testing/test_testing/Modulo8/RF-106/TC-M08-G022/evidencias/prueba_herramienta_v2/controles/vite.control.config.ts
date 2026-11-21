// | Fecha      | Nombre                  | Que se hizo |
// |------------|-------------------------|-------------|
// | 2026-11-20 | Juan Sebastian Gutierrez | TC-M08-G022: control "vista_control" de la prueba de la herramienta (no es parte de la corrida oficial) |
//
// Demuestra que CP-02 (tasa de error) puede dar OK: aplica EN MEMORIA, al compilar, un reemplazo en
// src/prediction/pages/HistorialPredictivoView.tsx (el archivo en disco no se toca).
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  [
    "<small>{t('historialpredictivo.tvco_ayuda')}</small>",
    "<small>{t('historialpredictivo.tvco_ayuda')}</small><div>Tasa de error: {datos.tvco.tasa_error ?? '—'}%</div>",
  ],
];

function vistaControl(): Plugin {
  return {
    name: 'qa-g022-vista-control',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let salida = code;
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g022-vista-control: "${viejo.slice(0, 60)}..." aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [vistaControl()] });
