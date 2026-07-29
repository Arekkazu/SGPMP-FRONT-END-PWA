import React from 'react';
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { Severidad } from '../types';

interface Meta {
  label: string;
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<Severidad, Meta> = {
  LEVE: { label: 'Leve', tono: 'info', icon: <Info size={SIZE} aria-hidden /> },
  MODERADO: { label: 'Moderado', tono: 'warning', icon: <AlertTriangle size={SIZE} aria-hidden /> },
  CRITICO: { label: 'Crítico', tono: 'error', icon: <AlertOctagon size={SIZE} aria-hidden /> },
};

function normalizar(sev: string | null | undefined): Severidad | null {
  const up = (sev ?? '').toUpperCase();
  return up in META ? (up as Severidad) : null;
}

export function SeveridadBadge({ severidad }: { severidad: string | null | undefined }) {
  const key = normalizar(severidad);
  if (!key) return <Pill tono="neutral">{severidad ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
