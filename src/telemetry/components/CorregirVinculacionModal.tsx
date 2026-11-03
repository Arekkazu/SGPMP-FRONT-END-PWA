// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-03 RF-61: activos candidatos y modelo de manejo en solo lectura |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { LABEL } from './tableStyles';
import { CampoActivoCandidato, CampoModeloManejo, idDeTextoActivo, textoActivo as textoInicial } from './CamposVinculacion';
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
  const [textoActivo, setTextoActivo] = useState(textoInicial(vinc.id_activo_biologico));
  const [modelo, setModelo] = useState(vinc.modelo_manejo ?? '');
  const [motivo, setMotivo] = useState('');
  const [touched, setTouched] = useState(false);

  const idActivo = idDeTextoActivo(textoActivo);
  const faltaActivo = !(idActivo > 0);
  const faltaModelo = !modelo.trim();
  const motivoInvalido = motivo.trim().length < 5;

  const confirmar = () => {
    setTouched(true);
    if (faltaActivo || faltaModelo || motivoInvalido) return;
    onConfirm({ id_activo_biologico: idActivo, modelo_manejo: modelo.trim(), motivo: motivo.trim() });
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
        <CampoActivoCandidato id="cv-activo" idInfraestructura={vinc.id_infraestructura} value={textoActivo} onChange={setTextoActivo}
          error={touched && faltaActivo ? t('camposvinculacion.elige_un_activo') : undefined} />
      </div>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <CampoModeloManejo id="cv-modelo" fijo={vinc.modelo_manejo} value={modelo} onChange={setModelo}
          error={touched && faltaModelo ? t('corregirvinculacionmodal.este_campo_es_obligatorio') : undefined} />
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
