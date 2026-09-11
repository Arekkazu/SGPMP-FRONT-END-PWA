import React from 'react';
import { CheckCircle2, HelpCircle, Unlink, AlertTriangle, Archive } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoVinculacion } from '../types';

interface Meta { label: string; tono: Tono; icon: React.ReactNode }
const SIZE = 12;

const META: Record<EstadoVinculacion, Meta> = {
  CONFIRMADA: { label: 'Confirmada', tono: 'success', icon: <CheckCircle2 size={SIZE} aria-hidden /> },
  AMBIGUA: { label: 'Ambigua', tono: 'warning', icon: <HelpCircle size={SIZE} aria-hidden /> },
  SIN_VINCULAR: { label: 'Sin vincular', tono: 'neutral', icon: <Unlink size={SIZE} aria-hidden /> },
  PENDIENTE_REVISION: { label: 'Pendiente revisión', tono: 'info', icon: <AlertTriangle size={SIZE} aria-hidden /> },
  SUPERADA: { label: 'Superada', tono: 'neutral', icon: <Archive size={SIZE} aria-hidden /> },
};

function normalizar(estado: string | null | undefined): EstadoVinculacion | null {
  const up = (estado ?? '').toUpperCase().replace(/\s+/g, '_');
  return up in META ? (up as EstadoVinculacion) : null;
}

export function EstadoVinculacionPill({ estado }: { estado: string | null | undefined }) {
  const key = normalizar(estado);
  if (!key) return <Pill tono="neutral">{estado ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
