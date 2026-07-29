import React, { useState } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { INPUT, LABEL } from './tableStyles';
import type { VinculacionLecturaSchema, ResolverVinculacionDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  vinc: VinculacionLecturaSchema;
  saving: boolean;
  saveError: ApiError | null;
  onConfirm: (dto: ResolverVinculacionDTO) => void;
  onClose: () => void;
}

export function ResolverVinculacionModal({ vinc, saving, saveError, onConfirm, onClose }: Props) {
  const [idActivo, setIdActivo] = useState('');
  const [modelo, setModelo] = useState(vinc.modelo_manejo ?? '');
  const [touched, setTouched] = useState(false);

  const faltaActivo = !idActivo.trim() || Number(idActivo) <= 0;
  const faltaModelo = !modelo.trim();

  const confirmar = () => {
    setTouched(true);
    if (faltaActivo || faltaModelo) return;
    onConfirm({ id_activo_biologico: Number(idActivo), modelo_manejo: modelo.trim() });
  };

  return (
    <ModalShell
      title={`Resolver vinculación #${vinc.id_vinculacion_lectura}`}
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={confirmar}>Confirmar vinculación</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
        Asigna el activo biológico correcto para la lectura <strong>#{vinc.id_telemetria}</strong>.
      </p>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="rv-activo">ID activo biológico *</label>
        <input id="rv-activo" type="number" style={{ ...INPUT, borderColor: touched && faltaActivo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={idActivo} onChange={(e) => setIdActivo(e.target.value)} aria-required aria-invalid={touched && faltaActivo} />
        {touched && faltaActivo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Ingresa un ID válido.</p>}
      </div>

      <div>
        <label style={LABEL} htmlFor="rv-modelo">Modelo de manejo *</label>
        <input id="rv-modelo" style={{ ...INPUT, borderColor: touched && faltaModelo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={modelo} onChange={(e) => setModelo(e.target.value)} aria-required aria-invalid={touched && faltaModelo} placeholder="Ej: INDIVIDUAL / LOTE" />
        {touched && faltaModelo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Este campo es obligatorio.</p>}
      </div>

      {saveError && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={saveError.status === 403 ? 'Sin permiso para resolver' : 'No se pudo resolver la vinculación'} description={saveError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}
