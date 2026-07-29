import React from 'react';
import { Flag } from 'lucide-react';
import { Pill } from './Pill';

function esActivo(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0 && v.toLowerCase() !== 'false';
  return true;
}

function etiqueta(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  flags: Record<string, unknown> | null | undefined;
  max?: number;
}

/** Renderiza los flags activos de `flags_detectados` como chips (RF-62). */
export function FlagChips({ flags, max }: Props) {
  const activos = flags ? Object.keys(flags).filter((k) => esActivo(flags[k])) : [];
  if (activos.length === 0) {
    return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>;
  }
  const visibles = max != null ? activos.slice(0, max) : activos;
  const resto = activos.length - visibles.length;
  return (
    <span style={{ display: 'inline-flex', gap: 'var(--s1)', flexWrap: 'wrap', alignItems: 'center' }}>
      {visibles.map((k) => (
        <Pill key={k} tono="warning" icon={<Flag size={11} aria-hidden />}>{etiqueta(k)}</Pill>
      ))}
      {resto > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>+{resto}</span>}
    </span>
  );
}
