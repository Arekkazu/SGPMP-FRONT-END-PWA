import React, { useState } from 'react';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { INPUT, LABEL } from './tableStyles';
import type { VinculacionLecturaSchema, CorregirVinculacionDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  vinc: VinculacionLecturaSchema;
  saving: boolean;
  saveError: ApiError | null;
  onConfirm: (dto: CorregirVinculacionDTO) => void;
  onClose: () => void;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)',
  color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)',
  minHeight: 80, resize: 'vertical', outline: 'none',
};

export function CorregirVinculacionModal({ vinc, saving, saveError, onConfirm, onClose }: Props) {
  const [idActivo, setIdActivo] = useState(vinc.id_activo_biologico != null ? String(vinc.id_activo_biologico) : '');
  const [modelo, setModelo] = useState(vinc.modelo_manejo ?? '');
  const [motivo, setMotivo] = useState('');
  const [touched, setTouched] = useState(false);

  const faltaActivo = !idActivo.trim() || Number(idActivo) <= 0;
  const faltaModelo = !modelo.trim();
  const motivoInvalido = motivo.trim().length < 5;

  const confirmar = () => {
    setTouched(true);
    if (faltaActivo || faltaModelo || motivoInvalido) return;
    onConfirm({ id_activo_biologico: Number(idActivo), modelo_manejo: modelo.trim(), motivo: motivo.trim() });
  };

  return (
    <ModalShell
      title={`Corregir vinculación #${vinc.id_vinculacion_lectura}`}
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="sm" loading={saving} disabled={saving} onClick={confirmar}>Confirmar corrección</Button>
        </>
      }
    >
      <Alert variant="warning" title="Esta acción crea una nueva vinculación" description="La vinculación actual pasará a estado SUPERADA (trazabilidad NIC 41)." style={{ marginBottom: 'var(--s4)' }} />

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="cv-activo">Nuevo activo biológico correcto *</label>
        <input id="cv-activo" type="number" style={{ ...INPUT, borderColor: touched && faltaActivo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={idActivo} onChange={(e) => setIdActivo(e.target.value)} aria-required aria-invalid={touched && faltaActivo} />
        {touched && faltaActivo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Ingresa un ID válido.</p>}
      </div>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="cv-modelo">Modelo de manejo *</label>
        <input id="cv-modelo" style={{ ...INPUT, borderColor: touched && faltaModelo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={modelo} onChange={(e) => setModelo(e.target.value)} aria-required aria-invalid={touched && faltaModelo} />
        {touched && faltaModelo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Este campo es obligatorio.</p>}
      </div>

      <div>
        <label style={{ ...LABEL, textTransform: 'none' as const }} htmlFor="cv-motivo">Motivo de la corrección * (5–500 caracteres)</label>
        <textarea id="cv-motivo" style={{ ...TEXTAREA, borderColor: touched && motivoInvalido ? 'var(--sem-error)' : 'var(--surface-border)' }} value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} aria-required aria-invalid={touched && motivoInvalido} />
        {touched && motivoInvalido && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>Mínimo 5 caracteres.</p>}
      </div>

      {saveError && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={saveError.status === 403 ? 'Sin permiso para corregir' : 'No se pudo corregir la vinculación'} description={saveError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}
