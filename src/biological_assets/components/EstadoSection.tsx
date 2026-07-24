import React, { useState } from 'react';
import { RefreshCw, Archive } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useEstadoActivo } from '../hooks/useEstadoActivo';
import { EstadoPill } from './EstadoPill';
import { CambiarEstadoModal } from './CambiarEstadoModal';
import { CerrarCicloModal } from './CerrarCicloModal';
import { RECURSO_ACTIVOS, ACCION_E, ACCION_D } from '../rbac';
import type { CambiarEstadoDTO, CerrarCicloDTO } from '../types';

interface Props {
  idActivo: number;
  estadoActual: string | null;
  identificador: string | null;
  onChanged: () => void;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

function esTerminalOCerrado(estado: string | null): boolean {
  const up = (estado ?? '').toUpperCase().replace(/\s+/g, '_');
  return up === 'CERRADO' || up === 'BAJA';
}

export function EstadoSection({ idActivo, estadoActual, identificador, onChanged }: Props) {
  const online = useOnlineStatus();
  const puedeCambiar = usePermission(RECURSO_ACTIVOS, ACCION_E);
  const puedeCerrar = usePermission(RECURSO_ACTIVOS, ACCION_D);
  const { saving, error, cambiarEstado, cerrarCiclo, setError } = useEstadoActivo(idActivo);

  const [modal, setModal] = useState<'ninguno' | 'cambiar' | 'cerrar'>('ninguno');

  const abrir = (m: 'cambiar' | 'cerrar') => { setError(null); setModal(m); };
  const cerrar = () => setModal('ninguno');

  const handleCambiar = async (dto: CambiarEstadoDTO): Promise<boolean> => {
    const res = await cambiarEstado(dto);
    if (res) { onChanged(); return true; }
    return false;
  };

  const handleCerrar = async (dto: CerrarCicloDTO): Promise<boolean> => {
    const res = await cerrarCiclo(dto);
    if (res) { onChanged(); return true; }
    return false;
  };

  const bloqueado = esTerminalOCerrado(estadoActual);

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Estado actual</span>
          <EstadoPill estado={estadoActual} size="md" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          {puedeCambiar && (
            <Button variant="secondary" size="sm" disabled={!online} onClick={() => abrir('cambiar')}>
              <RefreshCw size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Cambiar estado
            </Button>
          )}
          {puedeCerrar && !bloqueado && (
            <Button variant="danger" size="sm" disabled={!online} onClick={() => abrir('cerrar')}>
              <Archive size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Cerrar ciclo
            </Button>
          )}
        </div>
      </div>

      {bloqueado && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 'var(--s4) 0 0' }}>
          El activo está {estadoActual?.toLowerCase()}. No admite cierre de ciclo
          {(estadoActual ?? '').toUpperCase() === 'BAJA' ? ' ni más transiciones (estado terminal)' : ''}.
        </p>
      )}

      {modal === 'cambiar' && (
        <CambiarEstadoModal
          estadoActual={estadoActual}
          saving={saving}
          error={error}
          onClose={cerrar}
          onConfirmar={handleCambiar}
        />
      )}
      {modal === 'cerrar' && (
        <CerrarCicloModal
          identificador={identificador}
          saving={saving}
          error={error}
          onClose={cerrar}
          onConfirmar={handleCerrar}
        />
      )}
    </div>
  );
}
