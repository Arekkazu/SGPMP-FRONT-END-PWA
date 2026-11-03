// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53/RF-56: origen del dato (tiempo real, buffer local, agregado en Edge) |
import React from 'react';
import { Radio, Database, Cpu } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Pill, type Tono } from './Pill';
import type { OrigenDato } from '../types';

const META: Record<OrigenDato, { tono: Tono; icon: React.ReactNode; clave: string }> = {
  TIEMPO_REAL: { tono: 'success', icon: <Radio size={12} aria-hidden />, clave: 'vision.origen_tiempo_real' },
  BUFFER_LOCAL: { tono: 'warning', icon: <Database size={12} aria-hidden />, clave: 'vision.origen_buffer' },
  EDGE_AGREGADO: { tono: 'info', icon: <Cpu size={12} aria-hidden />, clave: 'vision.origen_edge' },
};

export function OrigenDatoPill({ origen }: { origen: OrigenDato }) {
  const { t } = useT('telemetry');
  const m = META[origen];
  return <Pill tono={m.tono} icon={m.icon} title={origen}>{t(m.clave)}</Pill>;
}
