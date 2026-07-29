import React from 'react';
import { Bot, Hand, Pencil } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { MecanismoVinculacion } from '../types';

interface Meta { label: string; tono: Tono; icon: React.ReactNode }
const SIZE = 12;

const META: Record<MecanismoVinculacion, Meta> = {
  AUTOMATICA: { label: 'Automática', tono: 'info', icon: <Bot size={SIZE} aria-hidden /> },
  MANUAL: { label: 'Manual', tono: 'neutral', icon: <Hand size={SIZE} aria-hidden /> },
  CORRECCION: { label: 'Corrección', tono: 'warning', icon: <Pencil size={SIZE} aria-hidden /> },
};

function normalizar(m: string | null | undefined): MecanismoVinculacion | null {
  const up = (m ?? '').toUpperCase();
  return up in META ? (up as MecanismoVinculacion) : null;
}

export function MecanismoPill({ mecanismo }: { mecanismo: string | null | undefined }) {
  const key = normalizar(mecanismo);
  if (!key) return <Pill tono="neutral">{mecanismo ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
