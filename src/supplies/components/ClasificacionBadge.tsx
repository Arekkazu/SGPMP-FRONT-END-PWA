// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | TC-DIS-208 RF-80: clasificación NIC-41 / técnica del evento con icono y texto |
import React from 'react';
import { Landmark, Wrench } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { useT } from '../../shared/i18n/useT';

/** Clasificación de retención (RF-80) con icono y texto, nunca solo color. */
export function ClasificacionBadge({ clasificacion }: { clasificacion: string | null | undefined }) {
  const { t } = useT('supplies');
  if (!clasificacion) return <>{t('auditoria.sin_clasificacion')}</>;
  const nic41 = clasificacion === 'NIC41';
  return (
    <Badge variant={nic41 ? 'info' : 'neutral'}>
      {nic41 ? <Landmark size={12} aria-hidden /> : <Wrench size={12} aria-hidden />}
      {t(`auditoria.clase_${clasificacion}`, { defaultValue: clasificacion })}
    </Badge>
  );
}
