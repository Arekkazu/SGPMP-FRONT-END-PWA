// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | RFC-010 RF-69: estado SOMBRA, versión por animal y fuente de datos |
// | 2026-11-02 | Arekkazu | AJF-08 RF-69: SOMBRA se muestra como "En prueba" |
import React from 'react';
import { FlaskConical, CheckCircle2, XCircle, Rocket, Archive, MoonStar } from 'lucide-react';
import { Pill, type Tono } from './Pill';
import { useT } from '../../shared/i18n/useT';
import type { EstadoVersion } from '../types';

const MAP: Record<EstadoVersion, { tono: Tono; label: string; icon: React.ReactNode }> = {
  EN_VALIDACION: { tono: 'info', label: 'En validación', icon: <FlaskConical size={12} aria-hidden /> },
  APROBADO: { tono: 'warning', label: 'Aprobado', icon: <CheckCircle2 size={12} aria-hidden /> },
  RECHAZADO: { tono: 'error', label: 'Rechazado', icon: <XCircle size={12} aria-hidden /> },
  SOMBRA: { tono: 'info', label: 'En prueba', icon: <MoonStar size={12} aria-hidden /> },
  ACTIVO: { tono: 'success', label: 'Activo', icon: <Rocket size={12} aria-hidden /> },
  DEPRECADO: { tono: 'neutral', label: 'Deprecado', icon: <Archive size={12} aria-hidden /> },
};

export function EstadoModeloPill({ estado }: { estado: EstadoVersion }) {
  const { t } = useT('prediction');
  const cfg = MAP[estado] ?? { tono: 'neutral' as Tono, label: estado, icon: null };
  // "Sombra" es jerga de MLOps: en pantalla se dice "En prueba" y el title explica que no alerta.
  if (estado === 'SOMBRA') {
    return <Pill tono={cfg.tono} icon={cfg.icon} title={t('modelostable.estado_sombra_ayuda')}>{t('modelostable.estado_sombra')}</Pill>;
  }
  return <Pill tono={cfg.tono} icon={cfg.icon}>{cfg.label}</Pill>;
}
