// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre (Combobox id+nombre) en vez de «ID infraestructura» |
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
}

/** Mismo patrón que SelectorActivo: se elige por nombre o se escribe el ID; el backend valida. */
export function SelectorArea({ id, areas, value, onChange }: Props) {
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
    />
  );
}
