// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: selector de activo con autocompletado que acepta el ID |
import React, { useMemo } from 'react';
import { Combobox } from '../../shared/design-system/Combobox';
import { idDeCatalogo, etiquetaDeCatalogo } from '../../shared/lib/catalogo';
import { humanizar } from '../../shared/lib/etiquetas';
import { useT } from '../../shared/i18n/useT';
import type { ActivoOpcion } from '../types';

interface Props {
  id: string;
  activos: ActivoOpcion[];
  cargando?: boolean;
  /** Texto escrito (nombre sugerido o ID). */
  value: string;
  onChange: (texto: string, idActivo: number | null) => void;
  required?: boolean;
  error?: string;
  label?: string;
  onBlur?: () => void;
}

export function nombreActivo(a: ActivoOpcion): string {
  return a.identificador?.trim() || `${humanizar(a.tipo)} ${a.nombre_especie ?? ''}`.trim();
}

/** Combobox de activos (regla QA: se escribe el nombre o el ID; el backend valida el ID). */
export function SelectorActivo({ id, activos, cargando, value, onChange, required, error, label, onBlur }: Props) {
  const { t } = useT('supplies');
  const catalogo = useMemo(() => activos.map((a) => ({ id: a.id_activo_biologico, nombre: nombreActivo(a) })), [activos]);
  const opciones = useMemo(() => activos.map((a) => ({
    valor: etiquetaDeCatalogo(nombreActivo(a), a.id_activo_biologico),
    detalle: [a.nombre_especie, a.nombre_infraestructura, a.nombre_estado].filter(Boolean).join(' · '),
  })), [activos]);

  return (
    <Combobox
      id={id}
      label={label ?? t('comun.activo')}
      opciones={opciones}
      value={value}
      onChange={(texto) => onChange(texto, idDeCatalogo(texto, catalogo))}
      onBlur={onBlur}
      required={required}
      error={error}
      placeholder={cargando ? t('comun.cargando') : t('comun.activo_placeholder')}
      hint={t('comun.activo_hint')}
    />
  );
}
