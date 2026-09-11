import React from 'react';
import { CheckCircle2, XCircle, Clock, MinusCircle, Loader2 } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoOta } from '../types';

const MAP: Record<EstadoOta, { tono: Tono; label: string; icon: React.ReactNode }> = {
  EXITOSO: { tono: 'success', label: 'Exitoso', icon: <CheckCircle2 size={12} aria-hidden /> },
  FALLIDO: { tono: 'error', label: 'Fallido', icon: <XCircle size={12} aria-hidden /> },
  PENDIENTE: { tono: 'info', label: 'Pendiente', icon: <Clock size={12} aria-hidden /> },
  SIN_CAMBIOS: { tono: 'neutral', label: 'Sin cambios', icon: <MinusCircle size={12} aria-hidden /> },
  EN_PROCESO: { tono: 'warning', label: 'En proceso', icon: <Loader2 size={12} aria-hidden /> },
};

export function EstadoOtaPill({ estado }: { estado: EstadoOta }) {
  const cfg = MAP[estado] ?? { tono: 'neutral' as Tono, label: estado, icon: null };
  return <Pill tono={cfg.tono} icon={cfg.icon}>{cfg.label}</Pill>;
}
