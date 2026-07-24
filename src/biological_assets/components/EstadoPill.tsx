import React from 'react';
import {
  CheckCircle2, PauseCircle, Stethoscope, ShieldAlert, Archive, XCircle, HelpCircle,
} from 'lucide-react';
import type { EstadoActivoNombre } from '../types';

interface EstadoMeta {
  label: string;
  fg: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}

const SIZE = 13;

const META: Record<EstadoActivoNombre, EstadoMeta> = {
  ACTIVO: {
    label: 'Activo',
    fg: 'var(--sem-success)', bg: 'var(--sem-success-bg)', border: 'var(--sem-success-border)',
    icon: <CheckCircle2 size={SIZE} aria-hidden />,
  },
  INACTIVO: {
    label: 'Inactivo',
    fg: 'var(--text-muted)', bg: 'var(--surface-hover)', border: 'var(--surface-border)',
    icon: <PauseCircle size={SIZE} aria-hidden />,
  },
  EN_TRATAMIENTO: {
    label: 'En tratamiento',
    fg: 'var(--sem-warning)', bg: 'var(--sem-warning-bg)', border: 'var(--sem-warning-border)',
    icon: <Stethoscope size={SIZE} aria-hidden />,
  },
  AISLADO: {
    label: 'Aislado',
    fg: 'var(--sem-info)', bg: 'var(--sem-info-bg)', border: 'var(--sem-info-border)',
    icon: <ShieldAlert size={SIZE} aria-hidden />,
  },
  CERRADO: {
    label: 'Cerrado',
    fg: 'var(--text-secondary)', bg: 'var(--surface-hover)', border: 'var(--surface-border)',
    icon: <Archive size={SIZE} aria-hidden />,
  },
  BAJA: {
    label: 'Baja',
    fg: 'var(--sem-error)', bg: 'var(--sem-error-bg)', border: 'var(--sem-error-border)',
    icon: <XCircle size={SIZE} aria-hidden />,
  },
};

function normalizar(estado: string | null | undefined): EstadoActivoNombre | null {
  if (!estado) return null;
  const up = estado.toUpperCase().replace(/\s+/g, '_');
  return (up in META ? (up as EstadoActivoNombre) : null);
}

interface Props {
  estado: string | null | undefined;
  size?: 'sm' | 'md';
}

export function EstadoPill({ estado, size = 'sm' }: Props) {
  const key = normalizar(estado);
  const meta: EstadoMeta = key
    ? META[key]
    : {
        label: estado ?? '—',
        fg: 'var(--text-muted)', bg: 'var(--surface-hover)', border: 'var(--surface-border)',
        icon: <HelpCircle size={SIZE} aria-hidden />,
      };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--s1)',
        padding: size === 'md' ? '4px var(--s3)' : '2px var(--s2)',
        borderRadius: 'var(--r-full)',
        fontSize: size === 'md' ? '13px' : '11px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: meta.fg,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}
