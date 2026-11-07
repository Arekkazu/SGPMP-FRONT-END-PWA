// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre (Combobox id+nombre) en vez de «ID infraestructura» |
// | 2026-11-02 | Arekkazu | AJF-05 RF-59: deshabilitado y texto de ayuda |
// | 2026-11-03 | Arekkazu | Filtros: combobox compacto, alineado con los select de la fila |
import React, { useMemo } from 'react';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import { useT } from '../../shared/i18n/useT';
import type { AreaTelemetria } from '../hooks/useAreas';

interface Props {
  id: string;
  areas: AreaTelemetria[];
  /** Texto escrito: el nombre sugerido «Área (#id)» o el ID. */
  value: string;
  onChange: (texto: string, idArea: number | null) => void;
  disabled?: boolean;
  /** Texto de ayuda bajo el campo (p. ej. por qué está deshabilitado). */
  hint?: string;
  /** En una fila de filtros (ver Combobox). */
  compacto?: boolean;
}

/** Mismo patrón que SelectorActivo: se elige por nombre o se escribe el ID; el backend valida. */
export function SelectorArea({ id, areas, value, onChange, disabled, hint, compacto }: Props) {
  const { t } = useT('telemetry');
  const catalogo = useMemo(() => areas.map((a) => ({ id: a.id, nombre: a.nombre })), [areas]);
  const opciones = useMemo(
    () => areas.map((a) => ({ valor: etiquetaDeCatalogo(a.nombre, a.id), detalle: a.finca })),
    [areas],
  );
  return (
    <Combobox
      id={id}
      label={t('selectorarea.area')}
      opciones={opciones}
      value={value}
      onChange={(texto) => onChange(texto, idDeCatalogo(texto, catalogo))}
      placeholder={t('selectorarea.placeholder')}
      vacio={t('selectorarea.vacio')}
      disabled={disabled}
      hint={hint}
      compacto={compacto}
    />
  );
}
