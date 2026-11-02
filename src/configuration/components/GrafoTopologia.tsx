// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: grafo de las áreas de la finca y sus aristas de transmisión |
import React, { useId } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';

export type NivelNodo = 'BAJO' | 'MEDIO' | 'ALTO';
export interface NodoGrafo { id: number; nombre: string; activo: boolean; nivel?: NivelNodo | null; detalle?: string; foco?: boolean }
export interface AristaGrafo { id: number; origen: number; destino: number; via: string; bidireccional: boolean; peso: number }

const W = 640, H = 380, R_NODO = 22;
const COLOR: Record<NivelNodo, string> = { ALTO: 'var(--sem-error)', MEDIO: 'var(--sem-warning)', BAJO: 'var(--sem-success)' };

/** Áreas en una elipse: con las pocas áreas de una finca no se cruzan nombres ni flechas.
 * ponytail: sin motor de layout; con más de ~12 áreas habría que agruparlas o usar fuerzas. */
export function posiciones(ids: number[]): Map<number, { x: number; y: number }> {
  if (ids.length === 1) return new Map([[ids[0], { x: W / 2, y: H / 2 }]]);
  return new Map(ids.map((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / ids.length;
    return [id, { x: W / 2 + 230 * Math.cos(a), y: H / 2 + 120 * Math.sin(a) }];
  }));
}

export function GrafoTopologia({ nodos, aristas, titulo }: { nodos: NodoGrafo[]; aristas: AristaGrafo[]; titulo: string }) {
  const { t } = useT('configuration');
  const uid = useId().replace(/:/g, '');
  const pos = posiciones(nodos.map((n) => n.id));
  const nombre = new Map(nodos.map((n) => [n.id, n.nombre]));
  const visibles = aristas.filter((a) => pos.has(a.origen) && pos.has(a.destino));
  const via = (v: string) => t(`topologia.via_${v}`, { defaultValue: v });
  const relacion = (a: AristaGrafo) =>
    `${nombre.get(a.origen)} ${a.bidireccional ? '↔' : '→'} ${nombre.get(a.destino)} · ${via(a.via)} · ${t('topologia.peso', { peso: formatearNumero(a.peso) })}`;
  // Aristas entre el mismo par (otra vía) se separan para que no se tapen.
  const paralelas = new Map<string, number>();

  if (nodos.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('topologia.sin_areas')}</p>;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${uid}-t`} style={{ width: '100%', maxHeight: 420, display: 'block' }}>
        <title id={`${uid}-t`}>{`${titulo}: ${visibles.length ? visibles.map(relacion).join('; ') : t('topologia.sin_aristas')}`}</title>
        <defs>
          <marker id={`${uid}-f`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--text-secondary)" />
          </marker>
        </defs>
        {visibles.map((a) => {
          const p = pos.get(a.origen)!, q = pos.get(a.destino)!;
          const par = [a.origen, a.destino].sort().join('-');
          const k = paralelas.get(par) ?? 0;
          paralelas.set(par, k + 1);
          const dx = q.x - p.x, dy = q.y - p.y, largo = Math.hypot(dx, dy) || 1;
          const ux = dx / largo, uy = dy / largo, off = k * 16;
          const x1 = p.x + ux * (R_NODO + 4) - uy * off, y1 = p.y + uy * (R_NODO + 4) + ux * off;
          const x2 = q.x - ux * (R_NODO + 6) - uy * off, y2 = q.y - uy * (R_NODO + 6) + ux * off;
          return (
            <g key={a.id}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-secondary)" strokeWidth={1 + 3 * a.peso}
                markerEnd={`url(#${uid}-f)`} markerStart={a.bidireccional ? `url(#${uid}-f)` : undefined} />
              <text x={(x1 + x2) / 2 + uy * 14} y={(y1 + y2) / 2 - ux * 14 + 4} textAnchor="middle" fontSize="12" fill="var(--text-primary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke">
                {`${via(a.via)} · ${formatearNumero(a.peso)}`}
              </text>
            </g>
          );
        })}
        {nodos.map((n) => {
          const { x, y } = pos.get(n.id)!;
          return (
            <g key={n.id} opacity={n.activo ? 1 : 0.5}>
              {n.foco && <text x={x} y={y - R_NODO - 8} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--sem-error)">{t('topologia.foco')}</text>}
              <circle cx={x} cy={y} r={R_NODO} fill={n.nivel ? COLOR[n.nivel] : 'var(--surface-hover)'}
                stroke={n.foco ? 'var(--text-primary)' : 'var(--surface-border)'} strokeWidth={n.foco ? 3 : 1.5}
                strokeDasharray={n.activo ? undefined : '4 3'} />
              <text x={x} y={y + R_NODO + 16} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--text-primary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke">{n.nombre}</text>
              {n.detalle && <text x={x} y={y + R_NODO + 31} textAnchor="middle" fontSize="11" fill="var(--text-secondary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke">{n.detalle}</text>}
            </g>
          );
        })}
      </svg>
      <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--s1)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        {visibles.length ? visibles.map((a) => <li key={a.id}>{relacion(a)}</li>) : <li>{t('topologia.sin_aristas')}</li>}
      </ul>
    </div>
  );
}
