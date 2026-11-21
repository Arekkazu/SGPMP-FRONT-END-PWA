// Control "control_brush" de la prueba de la herramienta (TC-M08-G024). No es parte de la corrida oficial.
// v2 (cambio autorizado por Claude): en recharts 3.10 el Brush solo se dibuja si la gráfica tiene datos propios
// (lib/cartesian/Brush.js:802, chartData vacío -> null), por eso se agrega data={puntos.linea} al ComposedChart.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO_1 = 'CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,';
const NUEVO_1 = 'Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,';
const VIEJO_2 = '<Tooltip content={marcadorTooltip} />';
const NUEVO_2 = '<Tooltip content={marcadorTooltip} />\n<Brush dataKey="x" height={20} />';
const VIEJO_3 = '<ComposedChart margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>';
const NUEVO_3 = '<ComposedChart data={puntos.linea} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>';

function controlBrush(): Plugin {
  return {
    name: 'qa-g024-control-brush',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const v1 = normCode.split(VIEJO_1).length - 1;
      const v2 = normCode.split(VIEJO_2).length - 1;
      const v3 = normCode.split(VIEJO_3).length - 1;
      if (v1 !== 1) throw new Error(`qa-g024-control-brush: texto viejo 1 aparece ${v1} veces (se esperaba 1)`);
      if (v2 !== 1) throw new Error(`qa-g024-control-brush: texto viejo 2 aparece ${v2} veces (se esperaba 1)`);
      if (v3 !== 1) throw new Error(`qa-g024-control-brush: texto viejo 3 aparece ${v3} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO_1, NUEVO_1).replace(VIEJO_2, NUEVO_2).replace(VIEJO_3, NUEVO_3), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [controlBrush()] });
