import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { ClasificacionCalidad } from '../types';

interface Meta { label: string; tono: Tono; icon: React.ReactNode }
const SIZE = 12;

const META: Record<ClasificacionCalidad, Meta> = {
  APTO: { label: 'Apto', tono: 'success', icon: <CheckCircle2 size={SIZE} aria-hidden /> },
  APTO_CON_RESERVA: { label: 'Con reservas', tono: 'warning', icon: <AlertTriangle size={SIZE} aria-hidden /> },
  NO_APTO: { label: 'No apto', tono: 'error', icon: <XCircle size={SIZE} aria-hidden /> },
  INDETERMINADA: { label: 'Indeterminada', tono: 'neutral', icon: <HelpCircle size={SIZE} aria-hidden /> },
};

function normalizar(c: string | null | undefined): ClasificacionCalidad | null {
  const up = (c ?? '').toUpperCase().replace(/\s+/g, '_');
  return up in META ? (up as ClasificacionCalidad) : null;
}

export function ClasificacionCalidadPill({ clasificacion }: { clasificacion: string | null | undefined }) {
  const key = normalizar(clasificacion);
  if (!key) return <Pill tono="neutral">{clasificacion ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
