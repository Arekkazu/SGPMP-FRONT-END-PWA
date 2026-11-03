// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: estado de registros y trabajos con icono y texto |
import React from 'react';
import { CheckCircle2, Ban, Clock, AlertTriangle, Loader } from 'lucide-react';
import { Badge, type BadgeVariant } from '../../shared/design-system/Badge';
import { humanizar } from '../../shared/lib/etiquetas';
import { useT } from '../../shared/i18n/useT';

const VARIANTE: Record<string, { variante: BadgeVariant; icono: React.ReactNode }> = {
  VALIDADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  COMPLETADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  CALCULADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  CONSOLIDADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  ENTREGADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  EXITOSO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  GENERADO: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  RECHAZADO: { variante: 'error', icono: <AlertTriangle size={12} aria-hidden /> },
  ANULADO: { variante: 'neutral', icono: <Ban size={12} aria-hidden /> },
  REEMPLAZADO: { variante: 'neutral', icono: <Ban size={12} aria-hidden /> },
  PENDIENTE: { variante: 'warning', icono: <Clock size={12} aria-hidden /> },
  EN_PROCESO: { variante: 'info', icono: <Loader size={12} aria-hidden /> },
  EN_EJECUCION: { variante: 'info', icono: <Loader size={12} aria-hidden /> },
  FALLIDO: { variante: 'error', icono: <AlertTriangle size={12} aria-hidden /> },
  INTERRUMPIDO: { variante: 'warning', icono: <AlertTriangle size={12} aria-hidden /> },
  CA_NO_CALCULABLE: { variante: 'warning', icono: <AlertTriangle size={12} aria-hidden /> },
  EN_COLA: { variante: 'warning', icono: <Clock size={12} aria-hidden /> },
  PROCESANDO: { variante: 'info', icono: <Loader size={12} aria-hidden /> },
  OMITIDO: { variante: 'neutral', icono: <Ban size={12} aria-hidden /> },
  // Clasificación del CA (RF-74): menor es mejor.
  EXCELENTE: { variante: 'success', icono: <CheckCircle2 size={12} aria-hidden /> },
  ACEPTABLE: { variante: 'info', icono: <CheckCircle2 size={12} aria-hidden /> },
  BAJA: { variante: 'warning', icono: <AlertTriangle size={12} aria-hidden /> },
  CRITICA: { variante: 'error', icono: <AlertTriangle size={12} aria-hidden /> },
};

/** Nunca solo color (WCAG 1.4.1): icono + texto. Un estado desconocido sale neutro con su nombre. */
export function EstadoRegistroBadge({ estado }: { estado: string }) {
  const { t } = useT('supplies');
  const v = VARIANTE[estado] ?? { variante: 'neutral' as BadgeVariant, icono: null };
  return <Badge variant={v.variante}>{v.icono}{t(`estado.${estado}`, { defaultValue: humanizar(estado) })}</Badge>;
}
