import React from 'react';
import { Cpu, Server, Sparkles } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { OrigenEvento } from '../types';

interface Meta {
  label: string;
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<OrigenEvento, Meta> = {
  EDGE: { label: 'Edge', tono: 'info', icon: <Cpu size={SIZE} aria-hidden /> },
  BACKEND: { label: 'Backend', tono: 'neutral', icon: <Server size={SIZE} aria-hidden /> },
  IA: { label: 'IA', tono: 'warning', icon: <Sparkles size={SIZE} aria-hidden /> },
};

function normalizar(origen: string | null | undefined): OrigenEvento | null {
  const up = (origen ?? '').toUpperCase();
  return up in META ? (up as OrigenEvento) : null;
}

export function OrigenPill({ origen }: { origen: string | null | undefined }) {
  const key = normalizar(origen);
  if (!key) return <Pill tono="neutral">{origen ?? '—'}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{meta.label}</Pill>;
}
