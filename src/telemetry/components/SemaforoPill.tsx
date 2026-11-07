// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-11/13.10: GRIS se lee "Sin datos" y AMARILLO "Cerca del límite" |
// | 2026-10-29 | Arekkazu | USAB-M03 prototipo 13.4 RF-58: etiqueta del semáforo para el titular del área |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 M3-09 RF-58: con anomalía el semáforo dice que es del último valor válido |
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

/** Texto del estado ("Fuera de rango"), el mismo de la píldora. */
export const etiquetaSemaforo = (estado: string | null | undefined) => META[normalizar(estado)].label;

/** `prefijo`: aclara a qué valor se refiere (M3-09: «Último válido: Normal»). */
export function SemaforoPill({ estado, prefijo }: { estado: string | null | undefined; prefijo?: string }) {
  const meta = META[normalizar(estado)];
  return <Pill tono={meta.tono} icon={meta.icon}>{prefijo ? `${prefijo}: ${meta.label}` : meta.label}</Pill>;
}
