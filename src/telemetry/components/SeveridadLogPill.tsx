import React from 'react';
import { Info, AlertTriangle, AlertOctagon, Flame } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { SeveridadLog } from '../types';

interface Meta { label: string; tono: Tono; icon: React.ReactNode }
const SIZE = 12;

const META: Record<SeveridadLog, Meta> = {
  INFO: { label: 'Info', tono: 'info', icon: <Info size={SIZE} aria-hidden /> },
  WARNING: { label: 'Advertencia', tono: 'warning', icon: <AlertTriangle size={SIZE} aria-hidden /> },
  ERROR: { label: 'Error', tono: 'error', icon: <AlertOctagon size={SIZE} aria-hidden /> },
  CRITICAL: { label: 'Crítico', tono: 'error', icon: <Flame size={SIZE} aria-hidden /> },
};

function normalizar(s: string | null | undefined): SeveridadLog | null {
  const up = (s ?? '').toUpperCase();
  if (up === 'WARN') return 'WARNING';
  return up in META ? (up as SeveridadLog) : null;
}

export function SeveridadLogPill({ severidad }: { severidad: string | null | undefined }) {
  const key = normalizar(severidad);
  if (!key) return <Pill tono="neutral">{severidad ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
