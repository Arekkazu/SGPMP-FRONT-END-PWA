// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53/RF-56: tipo de dato ESCALAR o VECTOR_COMPORTAMIENTO (RFC-011) |
import React from 'react';
import { Activity, ScanEye } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Pill } from './Pill';

export type TipoDato = 'ESCALAR' | 'VECTOR_COMPORTAMIENTO';

/** RFC-011: la visión no trae valor/unidad, viaja como vector de comportamiento del área. */
export function TipoDatoPill({ tipo }: { tipo: TipoDato }) {
  const { t } = useT('telemetry');
  return tipo === 'VECTOR_COMPORTAMIENTO'
    ? <Pill tono="info" icon={<ScanEye size={12} aria-hidden />} title="VECTOR_COMPORTAMIENTO">{t('vision.tipo_vector')}</Pill>
    : <Pill tono="neutral" icon={<Activity size={12} aria-hidden />} title="ESCALAR">{t('vision.tipo_escalar')}</Pill>;
}
