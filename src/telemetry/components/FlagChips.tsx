// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | AJF-06 RF-62: texto para cuando no hay flags y etiqueta del catálogo de códigos |
import React from 'react';
import { Flag } from 'lucide-react';
import { Pill } from './Pill';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

function esActivo(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0 && v.toLowerCase() !== 'false';
  return true;
}


interface Props {
  flags: Record<string, unknown> | null | undefined;
  max?: number;
  /** Texto cuando no hay flags activos; en un detalle explica que no hubo problemas (AJF-06). */
  textoVacio?: string;
}

/** Renderiza los flags activos de `flags_detectados` como chips (RF-62). */
export function FlagChips({ flags, max, textoVacio }: Props) {
  const activos = flags ? Object.keys(flags).filter((k) => esActivo(flags[k])) : [];
  if (activos.length === 0) {
    return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{textoVacio ?? '—'}</span>;
  }
  const visibles = max != null ? activos.slice(0, max) : activos;
  const resto = activos.length - visibles.length;
  return (
    <span style={{ display: 'inline-flex', gap: 'var(--s1)', flexWrap: 'wrap', alignItems: 'center' }}>
      {visibles.map((k) => (
        <Pill key={k} tono="warning" icon={<Flag size={11} aria-hidden />}>{etiquetaCodigo(k)}</Pill>
      ))}
      {resto > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>+{resto}</span>}
    </span>
  );
}
