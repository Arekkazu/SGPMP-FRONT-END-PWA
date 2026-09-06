import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
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
  const { t } = useT('telemetry');
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
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('resolvervinculacionmodal.cancelar')}</Button>
          <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={confirmar}>{t('resolvervinculacionmodal.confirmar_vinculacion')}</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>{t('resolvervinculacionmodal.asigna_el_activo_biologico_correcto_para_la')}<strong>#{vinc.id_telemetria}</strong>.
      </p>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <label style={LABEL} htmlFor="rv-activo">{t('resolvervinculacionmodal.id_activo_biologico')}</label>
        <input id="rv-activo" type="number" style={{ ...INPUT, borderColor: touched && faltaActivo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={idActivo} onChange={(e) => setIdActivo(e.target.value)} aria-required aria-invalid={touched && faltaActivo} />
        {touched && faltaActivo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('resolvervinculacionmodal.ingresa_un_id_valido')}</p>}
      </div>

      <div>
        <label style={LABEL} htmlFor="rv-modelo">{t('resolvervinculacionmodal.modelo_de_manejo')}</label>
        <input id="rv-modelo" style={{ ...INPUT, borderColor: touched && faltaModelo ? 'var(--sem-error)' : 'var(--surface-border)' }} value={modelo} onChange={(e) => setModelo(e.target.value)} aria-required aria-invalid={touched && faltaModelo} placeholder={t('resolvervinculacionmodal.ej_individual_lote')} />
        {touched && faltaModelo && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{t('resolvervinculacionmodal.este_campo_es_obligatorio')}</p>}
      </div>

      {saveError && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={saveError.status === 403 ? t('resolvervinculacionmodal.sin_permiso_para_resolver') : t('resolvervinculacionmodal.no_se_pudo_resolver_la_vinculacion')} description={saveError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}
