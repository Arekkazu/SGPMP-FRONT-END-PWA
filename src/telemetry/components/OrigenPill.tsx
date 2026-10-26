// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-19: origen en palabras del usuario (Servidor, Equipo de campo) |
import React from 'react';
import { Cpu, Server, Sparkles } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import type { OrigenEvento } from '../types';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';

interface Meta {
  tono: Tono;
  icon: React.ReactNode;
}

const SIZE = 12;

const META: Record<OrigenEvento, Meta> = {
  EDGE: { tono: 'info', icon: <Cpu size={SIZE} aria-hidden /> },
  BACKEND: { tono: 'neutral', icon: <Server size={SIZE} aria-hidden /> },
  IA: { tono: 'warning', icon: <Sparkles size={SIZE} aria-hidden /> },
};

function normalizar(origen: string | null | undefined): OrigenEvento | null {
  const up = (origen ?? '').toUpperCase();
  return up in META ? (up as OrigenEvento) : null;
}

export function OrigenPill({ origen }: { origen: string | null | undefined }) {
  const key = normalizar(origen);
  if (!key) return <Pill tono="neutral">{etiquetaCodigo(origen)}</Pill>;
  const meta = META[key];
  return <Pill tono={meta.tono} icon={meta.icon}>{etiquetaCodigo(key)}</Pill>;
}
