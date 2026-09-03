import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('telemetry');
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
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('corregirvinculacionmodal.cancelar')}</Button>
          <Button variant="danger" size="sm" loading={saving} disabled={saving} onClick={confirmar}>{t('corregirvinculacionmodal.confirmar_correccion')}</Button>
        </>
      }
    >
      <Alert variant="warning" title={t('corregirvinculacionmodal.esta_accion_crea_una_nueva_vinculacion')} description="La vinculación actual pasará a estado SUPERADA (trazabilidad NIC 41)." style={{ marginBottom: 'var(--s4)' }} />

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="cv-activo">{t('corregirvinculacionmodal.nuevo_activo_biologico_correcto')}</label>
        <input id="cv-activo" type="number" style={{ ...INPUT, borderColor: touched && faltaActivo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={idActivo} onChange={(e) => setIdActivo(e.target.value)} aria-required aria-invalid={touched && faltaActivo} />
        {touched && faltaActivo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('corregirvinculacionmodal.ingresa_un_id_valido')}</p>}
      </div>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="cv-modelo">{t('corregirvinculacionmodal.modelo_de_manejo')}</label>
        <input id="cv-modelo" style={{ ...INPUT, borderColor: touched && faltaModelo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={modelo} onChange={(e) => setModelo(e.target.value)} aria-required aria-invalid={touched && faltaModelo} />
        {touched && faltaModelo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('corregirvinculacionmodal.este_campo_es_obligatorio')}</p>}
      </div>

      <div>
        <label style={{ ...LABEL, textTransform: 'none' as const }} htmlFor="cv-motivo">Motivo de la corrección * (5–500 caracteres)</label>
        <textarea id="cv-motivo" style={{ ...TEXTAREA, borderColor: touched && motivoInvalido ? 'var(--sem-error)' : 'var(--surface-border)' }} value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} aria-required aria-invalid={touched && motivoInvalido} />
        {touched && motivoInvalido && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('corregirvinculacionmodal.minimo_5_caracteres')}</p>}
      </div>

      {saveError && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={saveError.status === 403 ? t('corregirvinculacionmodal.sin_permiso_para_corregir') : t('corregirvinculacionmodal.no_se_pudo_corregir_la_vinculacion')} description={saveError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}
