import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Cpu, Info } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useSensorActivo } from '../hooks/useSensorActivo';
import { AsociarSensorModal } from './AsociarSensorModal';
import { RECURSO_SENSOR_ACTIVO, ACCION_C } from '../rbac';
import type { AsociarSensorActivoDTO, AsociacionSensorActivoResponse } from '../types';

interface Props {
  idActivo: number;
  esPoblacional: boolean;
  idInfraestructura: number | null;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

export function SensoresSection({ idActivo, esPoblacional, idInfraestructura }: Props) {
  const { t } = useT('biologicalAssets');
  const online = useOnlineStatus();
  const puedeAsociar = usePermission(RECURSO_SENSOR_ACTIVO, ACCION_C);
  const { saving, saveError, asociar, setSaveError } = useSensorActivo(idActivo);

  const [abierto, setAbierto] = useState(false);
  const [ultima, setUltima] = useState<AsociacionSensorActivoResponse | null>(null);

  const handleConfirmar = async (dto: AsociarSensorActivoDTO): Promise<boolean> => {
    const res = await asociar(dto);
    if (res) { setUltima(res); return true; }
    return false;
  };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Cpu size={16} aria-hidden />{t('sensoressection.sensores_iot')}</h3>
        {puedeAsociar && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => { setSaveError(null); setAbierto(true); }}>{t('sensoressection.asociar_sensor')}</Button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Info size={15} aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0 }}>
          La consulta de asociaciones sensor–activo se realiza desde el módulo de Configuración.
          Aquí puedes crear una nueva asociación{!puedeAsociar && ' (requiere rol Administrador o Ingeniero)'}.
        </p>
      </div>

      {ultima && (
        <Alert
          variant={ultima.advertencia ? 'warning' : 'success'}
          title={ultima.advertencia ? 'Asociación creada con advertencia' : 'Sensor asociado'}
          description={
            ultima.advertencia
              ?? `Sensor #${ultima.sensor_id} asociado (${ultima.tipo_asociacion}). Estado: ${ultima.estado_asociacion}.`
          }
          style={{ marginTop: 'var(--s4)' }}
        />
      )}

      {abierto && (
        <AsociarSensorModal
          esPoblacional={esPoblacional}
          idInfraestructura={idInfraestructura}
          saving={saving}
          saveError={saveError}
          onClose={() => setAbierto(false)}
          onConfirmar={handleConfirmar}
        />
      )}
    </div>
  );
}
