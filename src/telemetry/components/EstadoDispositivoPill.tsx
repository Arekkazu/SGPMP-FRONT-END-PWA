// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-19: estado fuera del catálogo con etiqueta legible |
import React from 'react';
import { Wifi, WifiOff, Database, Wrench, PowerOff, HelpCircle } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { EstadoDispositivo } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

interface Meta {
  label: string;
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<EstadoDispositivo, Meta> = {
  ACTIVO: { label: 'Activo', tono: 'success', icon: <Wifi size={SIZE} aria-hidden /> },
  'SIN_SEÑAL': { label: 'Sin señal', tono: 'neutral', icon: <WifiOff size={SIZE} aria-hidden /> },
  BUFFER_ACTIVO: { label: 'Modo buffer', tono: 'info', icon: <Database size={SIZE} aria-hidden /> },
  EN_MANTENIMIENTO: { label: 'Mantenimiento', tono: 'warning', icon: <Wrench size={SIZE} aria-hidden /> },
  INACTIVO: { label: 'Inactivo', tono: 'error', icon: <PowerOff size={SIZE} aria-hidden /> },
};

function normalizar(estado: string | null | undefined): EstadoDispositivo | null {
  const up = (estado ?? '').toUpperCase().replace(/SIN_SENAL/, 'SIN_SEÑAL');
  return up in META ? (up as EstadoDispositivo) : null;
}

export function EstadoDispositivoPill({ estado }: { estado: string | null | undefined }) {
  const key = normalizar(estado);
  // T-19: un estado que no está en el catálogo (DESCONOCIDO) se muestra legible, no en mayúsculas.
  if (!key) return <Pill tono="neutral" icon={<HelpCircle size={SIZE} aria-hidden />}>{etiquetaCodigo(estado)}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
