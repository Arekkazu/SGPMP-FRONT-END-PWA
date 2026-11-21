// Control "playwright_vista_control" de la prueba de la herramienta (TC-M08-G022). No es parte de la corrida oficial.
// Aplica en memoria al compilar HistorialPredictivoView.tsx: color amarillo (#eab308) en conflicto y <title> con todas
// las valoraciones de la misma inferencia unidas por " / ".
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type Plugin } from 'vite';
import base from '../../../../../../../../vite.config';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '../../../../../../../..');

const VIEJO = `shape={(p: { cx?: number; cy?: number; payload?: MarcadorHistorial }) => (
                             <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={14}>
                               {p.payload?.en_conflicto ? '⚠' : ({ CORRECTO: '✓', INCORRECTO: '✗', PARCIAL: '◐', SIN_EVENTO: '○' } as Record<string, string>)[p.payload?.valoracion ?? ''] ?? '•'}
                             </text>
                           )}`;

const NUEVO = `shape={(p: { cx?: number; cy?: number; payload?: MarcadorHistorial }) => (
                             <g>
                               <text x={p.cx} y={p.cy} textAnchor="middle" dominantBaseline="central" fontSize={14} fill={p.payload?.en_conflicto ? '#eab308' : undefined}>
                                 {p.payload?.en_conflicto ? '⚠' : ({ CORRECTO: '✓', INCORRECTO: '✗', PARCIAL: '◐', SIN_EVENTO: '○' } as Record<string, string>)[p.payload?.valoracion ?? ''] ?? '•'}
                               </text>
                               <title>{(datos?.retroalimentaciones ?? []).filter((r) => r.id_resultado_inferencia === p.payload?.id_resultado_inferencia).map((r) => \`\${r.veterinario} → \${t(\`historialpredictivo.valoracion.\${r.valoracion}\`)} · \${formatearFechaHora(r.fecha)}\`).join(' / ')}</title>
                             </g>
                           )}`;

function vistaControlPw(): Plugin {
  return {
    name: 'qa-g022-vista-control-pw',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').split('?')[0].endsWith('src/prediction/pages/HistorialPredictivoView.tsx')) return null;
      const normCode = code.replace(/\r\n/g, '\n');
      const veces = normCode.split(VIEJO).length - 1;
      if (veces !== 1) throw new Error(`qa-g022-vista-control-pw: bloque shape aparece ${veces} veces (se esperaba 1)`);
      return { code: normCode.replace(VIEJO, NUEVO), map: null };
    },
  };
}

export default mergeConfig(base, { root: RAIZ, plugins: [vistaControlPw()] });
