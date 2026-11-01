// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RFC-010 RF-69: estado SOMBRA, versión por animal y fuente de datos |
import React from 'react';
import { FlaskConical, CheckCircle2, XCircle, Rocket, Archive, MoonStar } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoVersion } from '../types';

const MAP: Record<EstadoVersion, { tono: Tono; label: string; icon: React.ReactNode }> = {
  EN_VALIDACION: { tono: 'info', label: 'En validación', icon: <FlaskConical size={12} aria-hidden /> },
  APROBADO: { tono: 'warning', label: 'Aprobado', icon: <CheckCircle2 size={12} aria-hidden /> },
  RECHAZADO: { tono: 'error', label: 'Rechazado', icon: <XCircle size={12} aria-hidden /> },
  SOMBRA: { tono: 'info', label: 'En sombra', icon: <MoonStar size={12} aria-hidden /> },
  ACTIVO: { tono: 'success', label: 'Activo', icon: <Rocket size={12} aria-hidden /> },
  DEPRECADO: { tono: 'neutral', label: 'Deprecado', icon: <Archive size={12} aria-hidden /> },
};

export function EstadoModeloPill({ estado }: { estado: EstadoVersion }) {
  const cfg = MAP[estado] ?? { tono: 'neutral' as Tono, label: estado, icon: null };
  return <Pill tono={cfg.tono} icon={cfg.icon}>{cfg.label}</Pill>;
}
