// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: grafo de las áreas de la finca y sus aristas de transmisión |
// | 2026-11-02 | Arekkazu | RF-110: botón para editar cada relación |
// | 2026-11-02 | Arekkazu | RF-110: conectar áreas tocándolas en el grafo, color e ícono por tipo de área |
import React, { useId, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Button } from '../../shared/design-system/Button';
import { alActivarConTeclado } from '../../shared/lib/teclado';

export type NivelNodo = 'BAJO' | 'MEDIO' | 'ALTO';
export interface NodoGrafo {
  id: number; nombre: string; activo: boolean; nivel?: NivelNodo | null; detalle?: string; foco?: boolean;
  /** Relleno cuando no hay nivel de contagio (p. ej. el color del tipo de área) y su ícono. */
  color?: string; icono?: LucideIcon;
}
export interface AristaGrafo { id: number; origen: number; destino: number; via: string; bidireccional: boolean; peso: number }

const W = 640, H = 380, R_NODO = 24;
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

export function GrafoTopologia<A extends AristaGrafo>({ nodos, aristas, titulo, onEditar, onConectar, leyenda }: {
  nodos: NodoGrafo[]; aristas: A[]; titulo: string;
  /** Con estas dos el grafo es editable: tocar una relación la edita; tocar dos áreas las conecta. */
  onEditar?: (arista: A) => void; onConectar?: (origen: number, destino: number) => void;
  leyenda?: { nombre: string; color: string }[];
}) {
  const { t } = useT('configuration');
  const uid = useId().replace(/:/g, '');
  const [origen, setOrigen] = useState<number | null>(null);
  const pos = posiciones(nodos.map((n) => n.id));
  const nombre = new Map(nodos.map((n) => [n.id, n.nombre]));
  const visibles = aristas.filter((a) => pos.has(a.origen) && pos.has(a.destino));
  const via = (v: string) => t(`topologia.via_${v}`, { defaultValue: v });
  const relacion = (a: AristaGrafo) =>
    `${nombre.get(a.origen)} ${a.bidireccional ? '↔' : '→'} ${nombre.get(a.destino)} · ${via(a.via)} · ${t('topologia.peso', { peso: formatearNumero(a.peso) })}`;
  // Aristas entre el mismo par (otra vía) se separan para que no se tapen.
  const paralelas = new Map<string, number>();

  const tocar = (id: number) => {
    if (!onConectar) return;
    if (origen == null) return setOrigen(id);
    if (origen !== id) onConectar(origen, id);
    setOrigen(null);
  };

  if (nodos.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('topologia.sin_areas')}</p>;
  return (
    <div>
      {onConectar && (
        <p aria-live="polite" style={{ fontSize: '12.5px', color: origen == null ? 'var(--text-secondary)' : 'var(--brand-500)', fontWeight: origen == null ? 400 : 700, margin: '0 0 var(--s2)' }}>
          {origen == null ? t('topologia.conectar_ayuda') : t('topologia.conectar_destino', { area: nombre.get(origen) })}
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-labelledby={`${uid}-t`} style={{ width: '100%', maxHeight: 420, display: 'block' }}>
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
              {/* Zona de clic ancha para el mouse; con teclado se edita desde la lista de abajo. */}
              {onEditar && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={16} style={{ cursor: 'pointer' }}
                aria-hidden onClick={() => onEditar(a)} />}
              <text x={(x1 + x2) / 2 + uy * 14} y={(y1 + y2) / 2 - ux * 14 + 4} textAnchor="middle" fontSize="12" fill="var(--text-primary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke" pointerEvents="none">
                {`${via(a.via)} · ${formatearNumero(a.peso)}`}
              </text>
            </g>
          );
        })}
        {nodos.map((n) => {
          const { x, y } = pos.get(n.id)!;
          const Icono = n.icono;
          const elegible = !!onConectar && n.activo;
          const elegido = origen === n.id;
          return (
            <g key={n.id} opacity={n.activo ? 1 : 0.5}
              {...(elegible ? {
                role: 'button', tabIndex: 0, style: { cursor: 'pointer' }, onClick: () => tocar(n.id), onKeyDown: alActivarConTeclado(() => tocar(n.id)),
                'aria-pressed': elegido, 'aria-label': t(origen == null || elegido ? 'topologia.conectar_nodo_origen' : 'topologia.conectar_nodo_destino', { area: n.nombre }),
              } : {})}>
              {n.foco && <text x={x} y={y - R_NODO - 8} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--sem-error)">{t('topologia.foco')}</text>}
              {elegido && <circle cx={x} cy={y} r={R_NODO + 7} fill="none" stroke="var(--brand-500)" strokeWidth={3} strokeDasharray="5 4" />}
              <circle cx={x} cy={y} r={R_NODO} fill={n.nivel ? COLOR[n.nivel] : n.color ?? 'var(--surface-hover)'}
                stroke={n.foco ? 'var(--text-primary)' : n.color ? 'var(--surface-card)' : 'var(--surface-border)'} strokeWidth={n.foco ? 3 : 2}
                strokeDasharray={n.activo ? undefined : '4 3'} />
              {Icono && <Icono x={x - 11} y={y - 11} width={22} height={22} color="#fff" aria-hidden />}
              <text x={x} y={y + R_NODO + 16} textAnchor="middle" fontSize="13" fontWeight={700} fill="var(--text-primary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke">{n.nombre}</text>
              {n.detalle && <text x={x} y={y + R_NODO + 31} textAnchor="middle" fontSize="11" fill="var(--text-secondary)"
                stroke="var(--surface-card)" strokeWidth={4} paintOrder="stroke">{n.detalle}</text>}
            </g>
          );
        })}
      </svg>
      {leyenda && leyenda.length > 0 && (
        <ul aria-label={t('topologia.leyenda')} style={{ listStyle: 'none', padding: 0, margin: 'var(--s2) 0 0', display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {leyenda.map((l) => (
            <li key={l.nombre} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s1)' }}>
              <span aria-hidden style={{ width: 12, height: 12, borderRadius: '50%', background: l.color }} />{l.nombre}
            </li>
          ))}
        </ul>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--s3) 0 0', display: 'flex', flexDirection: 'column', gap: 'var(--s1)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
        {visibles.length ? visibles.map((a) => (
          <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {relacion(a)}
            {onEditar && <Button variant="ghost" size="sm" onClick={() => onEditar(a)} aria-label={t('topologia.editar_aria', { relacion: relacion(a) })}>{t('topologia.editar')}</Button>}
          </li>
        )) : <li>{t('topologia.sin_aristas')}</li>}
      </ul>
    </div>
  );
}
