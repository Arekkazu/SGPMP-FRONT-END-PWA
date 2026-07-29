import React from 'react';
import { BellRing, Clock, CheckCircle2, XCircle, TimerOff, HelpCircle } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoAlerta } from '../types';

interface Meta {
  label: string;
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<EstadoAlerta, Meta> = {
  ACTIVA: { label: 'Activa', tono: 'error', icon: <BellRing size={SIZE} aria-hidden /> },
  EN_ATENCION: { label: 'En atención', tono: 'warning', icon: <Clock size={SIZE} aria-hidden /> },
  RESUELTA: { label: 'Resuelta', tono: 'success', icon: <CheckCircle2 size={SIZE} aria-hidden /> },
  DESCARTADA: { label: 'Descartada', tono: 'neutral', icon: <XCircle size={SIZE} aria-hidden /> },
  VENCIDA: { label: 'Vencida', tono: 'error', icon: <TimerOff size={SIZE} aria-hidden /> },
};

function normalizar(estado: string | null | undefined): EstadoAlerta | null {
  const up = (estado ?? '').toUpperCase().replace(/\s+/g, '_');
  return up in META ? (up as EstadoAlerta) : null;
}

export function EstadoAlertaPill({ estado }: { estado: string | null | undefined }) {
  const key = normalizar(estado);
  if (!key) {
    return <Pill tono="neutral" icon={<HelpCircle size={SIZE} aria-hidden />}>{estado ?? '—'}</Pill>;
  }
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
