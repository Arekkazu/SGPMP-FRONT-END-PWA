// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-11/13.10: GRIS se lee "Sin datos" y AMARILLO "Cerca del límite" |
import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, CircleOff } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoSemaforo } from '../types';

interface Meta {
  label: string;
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<EstadoSemaforo, Meta> = {
  VERDE: { label: 'Normal', tono: 'success', icon: <CheckCircle2 size={SIZE} aria-hidden /> },
  AMARILLO: { label: 'Cerca del límite', tono: 'warning', icon: <AlertTriangle size={SIZE} aria-hidden /> },
  ROJO: { label: 'Fuera de rango', tono: 'error', icon: <AlertOctagon size={SIZE} aria-hidden /> },
  GRIS: { label: 'Sin datos', tono: 'neutral', icon: <CircleOff size={SIZE} aria-hidden /> },
};

function normalizar(estado: string | null | undefined): EstadoSemaforo {
  const up = (estado ?? '').toUpperCase();
  return (up in META ? (up as EstadoSemaforo) : 'GRIS');
}

export function SemaforoPill({ estado }: { estado: string | null | undefined }) {
  const meta = META[normalizar(estado)];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
