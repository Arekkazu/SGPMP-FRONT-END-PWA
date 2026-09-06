import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { CheckCircle2, Ban, Lock, Pencil } from 'lucide-react';
import { Pill } from './Pill';

/** Estado activo/inactivo de una patología (icono + texto + color). */
export function EstadoActivoPill({ activo }: { activo: boolean }) {
  const { t } = useT('prediction');
  return activo ? (
    <Pill tono="success" icon={<CheckCircle2 size={12} aria-hidden />}>{t('patologiapills.activa')}</Pill>
  ) : (
    <Pill tono="neutral" icon={<Ban size={12} aria-hidden />}>{t('patologiapills.inactiva')}</Pill>
  );
}

/** Tipo base (inmutable) vs personalizada (editable). */
export function TipoPatologiaPill({ esBase }: { esBase: boolean }) {
  const { t } = useT('prediction');
  return esBase ? (
    <Pill tono="info" icon={<Lock size={12} aria-hidden />} title="Patología base del sistema (inmutable)">{t('patologiapills.base')}</Pill>
  ) : (
    <Pill tono="warning" icon={<Pencil size={12} aria-hidden />}>{t('patologiapills.personalizada')}</Pill>
  );
}
