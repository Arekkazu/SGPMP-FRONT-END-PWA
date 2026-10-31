// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18 RF-62: sensor por nombre en vez de «ID sensor» |
import React, { useMemo } from 'react';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import { useT } from '../../shared/i18n/useT';
import type { SensorCatalogo } from '../types';

interface Props {
  id: string;
  sensores: SensorCatalogo[];
  /** Texto escrito: el nombre sugerido «Sensor (#id)» o el ID. */
  value: string;
  onChange: (texto: string, idSensor: number | null) => void;
  required?: boolean;
  error?: string;
}

/** Mismo patrón que SelectorArea: se elige por nombre o se escribe el ID; el backend valida. */
export function SelectorSensor({ id, sensores, value, onChange, required, error }: Props) {
  const { t } = useT('telemetry');
  const catalogo = useMemo(() => sensores.map((s) => ({ id: s.id_sensor, nombre: s.nombre_sensor })), [sensores]);
  const opciones = useMemo(
    () => sensores.map((s) => ({
      valor: etiquetaDeCatalogo(s.nombre_sensor, s.id_sensor),
      detalle: [s.nombre_finca, s.nombre_infraestructura].filter(Boolean).join(' › '),
    })),
    [sensores],
  );
  return (
    <Combobox
      id={id}
      label={t('selectorsensor.sensor')}
      opciones={opciones}
      value={value}
      onChange={(texto) => onChange(texto, idDeCatalogo(texto, catalogo))}
      placeholder={t('selectorsensor.placeholder')}
      vacio={t('selectorsensor.vacio')}
      required={required}
      error={error}
    />
  );
}
