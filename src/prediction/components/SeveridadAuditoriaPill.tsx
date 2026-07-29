import React from 'react';
import { Info, AlertTriangle, AlertOctagon, Skull } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { SeveridadEvento } from '../types';

const MAP: Record<SeveridadEvento, { tono: Tono; label: string; icon: React.ReactNode }> = {
  INFO: { tono: 'info', label: 'Info', icon: <Info size={12} aria-hidden /> },
  WARNING: { tono: 'warning', label: 'Warning', icon: <AlertTriangle size={12} aria-hidden /> },
  ERROR: { tono: 'error', label: 'Error', icon: <AlertOctagon size={12} aria-hidden /> },
  CRITICAL: { tono: 'error', label: 'Crítico', icon: <Skull size={12} aria-hidden /> },
};

export function SeveridadAuditoriaPill({ severidad }: { severidad: SeveridadEvento }) {
  const cfg = MAP[severidad] ?? { tono: 'neutral' as Tono, label: severidad, icon: null };
  return <Pill tono={cfg.tono} icon={cfg.icon}>{cfg.label}</Pill>;
}
