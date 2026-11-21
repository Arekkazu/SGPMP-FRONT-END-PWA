// | Fecha      | Nombre                  | Que se hizo |
// |------------|-------------------------|-------------|
// | 2026-11-20 | Juan Sebastian Gutierrez | TC-M08-G021: control "vista_control" de la prueba de la herramienta (no es parte de la corrida oficial) |
//
// Demuestra que los checkpoints con FALLA prevista pueden dar OK: aplica EN MEMORIA, al compilar, tres cambios a
// src/prediction/pages/HistorialPredictivoView.tsx (el archivo en disco no se toca). Cada texto viejo debe aparecer
// exactamente una vez; si no, la compilacion falla. Se usa con Vitest (--config) y con vite build (parte Playwright).
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const REEMPLAZOS: Array<[string, string]> = [
  // 1) Symbols para el marcador de evento con <title> (tooltip nativo del SVG) con la diferencia de sus correspondencias
  ['CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,',
   'CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Symbols, Tooltip, XAxis, YAxis,'],
  // 2) Eventos con <title>, conectores punteados (correspondencias sin colision) y marcador "N eventos" por grupo
  ['<Scatter data={puntos.eventos} dataKey="y" fill="var(--danger-600, #dc2626)" shape="square" isAnimationActive={false} />',
   '<Scatter data={puntos.eventos} dataKey="y" fill="var(--danger-600, #dc2626)" isAnimationActive={false} '
   + 'shape={(p: { cx?: number; cy?: number; fill?: string; payload?: MarcadorHistorial }) => (<g><Symbols cx={p.cx} cy={p.cy} type="square" size={64} fill={p.fill} />'
   + '<title>{(datos?.correspondencias ?? []).filter((c) => c.id_evento === p.payload?.id_evento).map((c) => c.diferencia).join(\' \')}</title></g>)} />'
   + '{(datos?.correspondencias ?? []).filter((c) => !c.colision).map((c) => { const pp = puntos.linea.find((q) => q.id_resultado_inferencia === c.id_resultado_inferencia); '
   + 'const ee = puntos.eventos.find((q) => q.id_evento === c.id_evento); return pp && ee ? <Line key={`qa-con-${c.id_resultado_inferencia}-${c.id_evento}`} '
   + 'data={[{ x: pp.x, qa: pp.nivel }, { x: ee.x, qa: Y_EVENTO }]} dataKey="qa" stroke="#888" strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} /> : null; })}'
   + '<Scatter data={(datos?.grupos ?? []).map((g) => ({ x: Math.min(...g.map((m) => new Date(m.fecha).getTime())), y: 3.9, n: g.length }))} dataKey="y" isAnimationActive={false} '
   + 'shape={(p: { cx?: number; cy?: number; payload?: { n: number } }) => <text x={p.cx} y={p.cy} textAnchor="middle" fontSize={12}>{`${p.payload?.n ?? 0} eventos`}</text>} />'],
];

function vistaControl(): Plugin {
  return {
    name: 'qa-g021-vista-control',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      let salida = code;
      for (const [viejo, nuevo] of REEMPLAZOS) {
        const veces = salida.split(viejo).length - 1;
        if (veces !== 1) throw new Error(`qa-g021-vista-control: "${viejo.slice(0, 60)}..." aparece ${veces} veces (se esperaba 1)`);
        salida = salida.replace(viejo, nuevo);
      }
      return { code: salida, map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [vistaControl()] });
