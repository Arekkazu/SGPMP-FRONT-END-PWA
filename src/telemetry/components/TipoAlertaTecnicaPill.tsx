import React from 'react';
import { CloudDownload, DatabaseZap, FileWarning, ThermometerSun, Unplug } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Pill, type Tono } from './Pill';

// RF-60: el subtipo de una alerta TECNICA viaja en `tipo_variable`. Estos son los
// que agregan el aviso de buffer del Edge (DEV-11, RF-54) y el heartbeat ampliado
// (DEV-12, D11 de AIOT-DEV-03). Un subtipo sin entrada se muestra tal cual llega.
const SIZE = 12;

const META: Record<string, { clave: string; tono: Tono; icon: React.ReactNode }> = {
  BUFFER_OVERFLOW: { clave: 'buffer_overflow', tono: 'warning', icon: <DatabaseZap size={SIZE} aria-hidden /> },
  BUFFER_DATA_CORRUPTION: { clave: 'buffer_data_corruption', tono: 'error', icon: <FileWarning size={SIZE} aria-hidden /> },
  SENSOR_FISICO_FALLIDO: { clave: 'sensor_fisico_fallido', tono: 'error', icon: <Unplug size={SIZE} aria-hidden /> },
  SOBRECALENTAMIENTO: { clave: 'sobrecalentamiento', tono: 'error', icon: <ThermometerSun size={SIZE} aria-hidden /> },
  FIRMWARE_DESACTUALIZADO: { clave: 'firmware_desactualizado', tono: 'info', icon: <CloudDownload size={SIZE} aria-hidden /> },
};

export function TipoAlertaTecnicaPill({ tipo }: { tipo: string | null | undefined }) {
  const { t } = useT('telemetry');
  const meta = META[(tipo ?? '').toUpperCase()];
  if (!meta) return <>{tipo ?? '—'}</>;
  return (
    <Pill tono={meta.tono} icon={meta.icon} title={tipo ?? undefined}>
      {t(`tipoalertatecnica.${meta.clave}`)}
    </Pill>
  );
}
