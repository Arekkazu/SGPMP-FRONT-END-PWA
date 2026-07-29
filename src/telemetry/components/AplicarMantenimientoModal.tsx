import React, { useState } from 'react';
import { Wrench, Power } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { EstadoDispositivoPill } from './EstadoDispositivoPill';
import type { AplicarMantenimientoDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  idDispositivo: number;
  estadoActual: string;
  saving: boolean;
  saveError: ApiError | null;
  onConfirm: (dto: AplicarMantenimientoDTO) => void;
  onClose: () => void;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  minHeight: 80,
  resize: 'vertical',
  outline: 'none',
};

/**
 * Modal bidireccional único para la transición manual de mantenimiento (RF-60).
 * Auto-detecta el destino según el estado actual del dispositivo:
 *  - EN_MANTENIMIENTO → ACTIVO (reactivar)
 *  - cualquier otro   → EN_MANTENIMIENTO (poner en mantenimiento)
 * El backend solo acepta estos dos destinos; `motivo` es opcional (≤500).
 */
export function AplicarMantenimientoModal({ idDispositivo, estadoActual, saving, saveError, onConfirm, onClose }: Props) {
  const enMantenimiento = (estadoActual ?? '').toUpperCase() === 'EN_MANTENIMIENTO';
  const destino: AplicarMantenimientoDTO['nuevo_estado'] = enMantenimiento ? 'ACTIVO' : 'EN_MANTENIMIENTO';

  const titulo = enMantenimiento ? 'Reactivar dispositivo' : 'Poner en mantenimiento';
  const cta = enMantenimiento ? 'Reactivar' : 'Poner en mantenimiento';
  const icono = enMantenimiento ? <Power size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} /> : <Wrench size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />;

  const [motivo, setMotivo] = useState('');

  const confirmar = () => {
    onConfirm({ nuevo_estado: destino, motivo: motivo.trim() || null });
  };

  return (
    <ModalShell
      title={titulo}
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant={enMantenimiento ? 'primary' : 'secondary'} size="sm" loading={saving} disabled={saving} onClick={confirmar}>
            {icono}{cta}
          </Button>
        </>
      }
    >
      <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
        Dispositivo <strong>#{idDispositivo}</strong>
        <EstadoDispositivoPill estado={estadoActual} />
        <span aria-hidden>→</span>
        <EstadoDispositivoPill estado={destino} />
      </p>

      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="mant-motivo">
        Motivo (opcional)
      </label>
      <textarea
        id="mant-motivo"
        style={TEXTAREA}
        value={motivo}
        maxLength={500}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={enMantenimiento ? 'Ej: mantenimiento resuelto, sensor recalibrado…' : 'Ej: revisión programada, reemplazo de batería…'}
      />

      {saveError && (
        <Alert
          variant={saveError.status === 403 ? 'warning' : saveError.status === 404 || saveError.status === 422 ? 'info' : 'error'}
          title={
            saveError.status === 403
              ? 'Sin permiso para gestionar mantenimiento'
              : saveError.status === 422
                ? 'El dispositivo ya está en ese estado'
                : saveError.status === 404
                  ? 'Dispositivo no encontrado'
                  : 'No se pudo aplicar el cambio'
          }
          description={saveError.status != null && saveError.status >= 500 ? 'Ocurrió un error del servidor. Intenta de nuevo más tarde.' : saveError.message}
          style={{ marginTop: 'var(--s4)' }}
        />
      )}
    </ModalShell>
  );
}
