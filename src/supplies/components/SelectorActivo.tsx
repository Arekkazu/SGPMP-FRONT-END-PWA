// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-74..81: selector de activo con autocompletado que acepta el ID |
// | 2026-11-10 | Arekkazu | H-M05-15/16 RF-81: sin activos visibles, la ayuda dice por qué en vez de una lista vacía muda |
// | 2026-11-11 | Arekkazu | USAB-M05-M06 RF-74..81: reporte de usabilidad del 11-11 (nombres en lugar de ids, textos y formatos) |
import React, { useMemo } from 'react';
import { Combobox } from '../../shared/design-system/Combobox';
import { idDeCatalogo, etiquetaDeCatalogo } from '../../shared/lib/catalogo';
import i18n from '../../shared/i18n';
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

/** Su identificador; sin él, «Lote 1632» o «Animal 1632», igual que lo nombra el backend. */
export function nombreActivo(a: ActivoOpcion): string {
  return a.identificador?.trim()
    || i18n.t(a.tipo === 'POBLACIONAL' ? 'comun.lote_n' : 'comun.animal_n', { ns: 'supplies', id: a.id_activo_biologico });
}

/** Combobox de activos (regla QA: se escribe el nombre o el ID; el backend valida el ID). */
export function SelectorActivo({ id, activos, cargando, value, onChange, required, error, label, onBlur }: Props) {
  const { t } = useT('supplies');
  const catalogo = useMemo(() => activos.map((a) => ({ id: a.id_activo_biologico, nombre: nombreActivo(a) })), [activos]);
  const opciones = useMemo(() => activos.map((a) => ({
    // Sin identificador el nombre ya lleva el número: «Lote 1632», no «Lote 1632 (#1632)».
    valor: a.identificador?.trim() ? etiquetaDeCatalogo(nombreActivo(a), a.id_activo_biologico) : nombreActivo(a),
    detalle: [a.nombre_especie, a.nombre_infraestructura, a.nombre_estado && t(`estado_activo.${a.nombre_estado}`, { defaultValue: a.nombre_estado })]
      .filter(Boolean).join(' · '),
  })), [activos, t]);

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
      hint={!cargando && activos.length === 0 ? t('comun.activo_sin_visibles') : t('comun.activo_hint')}
    />
  );
}
