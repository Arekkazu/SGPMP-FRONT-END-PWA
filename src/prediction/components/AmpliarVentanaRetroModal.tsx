// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-30 | Arekkazu | INC-M04-229-G070 RF-72: ampliación de la ventana para un resultado |
import React, { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { ModalShell } from './ModalShell';
import { INPUT, LABEL } from './tableStyles';
import type { AmpliarVentanaRetroDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

/** Mismos límites que valida el backend (RF-72, INC-M04-229-G070). */
const DIAS_MAX = 365;
const JUSTIFICACION_MIN = 10;
const JUSTIFICACION_MAX = 1000;

interface Props {
  idResultado: string;
  nombreActivo: string;
  fechaInferencia: string;
  saving: boolean;
  saveError: ApiError | null;
  online: boolean;
  onSubmit: (dto: AmpliarVentanaRetroDTO) => void;
  onClose: () => void;
}

/**
 * RF-72: el Administrador habilita un resultado vencido durante N días con una
 * justificación que queda en RF-73. Los demás resultados y la ventana global no cambian.
 */
export function AmpliarVentanaRetroModal({ idResultado, nombreActivo, fechaInferencia, saving, saveError, online, onSubmit, onClose }: Props) {
  const { t } = useT('prediction');
  const [dias, setDias] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [tocados, setTocados] = useState({ dias: false, justificacion: false });

  const n = Number(dias);
  const errDias = !(dias !== '' && Number.isInteger(n) && n >= 1 && n <= DIAS_MAX)
    ? t('ampliarventana.dias_invalidos', { max: DIAS_MAX }) : undefined;
  const largo = justificacion.trim().length;
  const errJustificacion = largo < JUSTIFICACION_MIN
    ? t('ampliarventana.justificacion_corta', { min: JUSTIFICACION_MIN }) : undefined;

  const submit = () => {
    setTocados({ dias: true, justificacion: true });
    if (errDias || errJustificacion) return;
    onSubmit({ id_resultado_inferencia: idResultado, dias_habilitados: n, justificacion: justificacion.trim() });
  };

  return (
    <ModalShell
      title={t('ampliarventana.titulo')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>{t('ampliarventana.cancelar')}</Button>
          <Button variant="primary" onClick={submit} loading={saving} disabled={!online}>
            <CalendarPlus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('ampliarventana.autorizar')}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {!online && <Alert variant="warning" title={t('ampliarventana.sin_conexion')} description={t('ampliarventana.sin_conexion_detalle')} />}
        {saveError && <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('ampliarventana.no_se_pudo')} description={saveError.message} />}
        <Alert variant="info" title={t('ampliarventana.alcance')} description={t('ampliarventana.alcance_detalle')} />

        <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div><strong>{t('ampliarventana.activo')}</strong> {nombreActivo}</div>
          <div title={idResultado}><strong>{t('ampliarventana.inferencia')}</strong> {formatearFechaHora(fechaInferencia)}</div>
        </div>

        <Input
          id="amp-dias"
          label={t('ampliarventana.dias')}
          type="number"
          inputMode="numeric"
          step={1}
          min={1}
          max={DIAS_MAX}
          required
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          onBlur={() => setTocados((v) => ({ ...v, dias: true }))}
          hint={t('ampliarventana.dias_ayuda', { max: DIAS_MAX })}
          error={tocados.dias ? errDias : undefined}
        />

        <div>
          <label style={LABEL} htmlFor="amp-justificacion">
            {t('ampliarventana.justificacion')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span>
          </label>
          <textarea
            id="amp-justificacion"
            value={justificacion}
            maxLength={JUSTIFICACION_MAX}
            aria-required="true"
            aria-invalid={tocados.justificacion && !!errJustificacion}
            aria-describedby="amp-justificacion-contador"
            onChange={(e) => setJustificacion(e.target.value)}
            onBlur={() => setTocados((v) => ({ ...v, justificacion: true }))}
            style={{ ...INPUT, height: 90, paddingTop: 'var(--s2)', resize: 'vertical', fontFamily: 'inherit' }}
          />
          {tocados.justificacion && errJustificacion && (
            <span role="alert" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--sem-error)' }}>{errJustificacion}</span>
          )}
          <span id="amp-justificacion-contador" style={{ display: 'block', marginTop: 'var(--s1)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
            {justificacion.length}/{JUSTIFICACION_MAX}
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
