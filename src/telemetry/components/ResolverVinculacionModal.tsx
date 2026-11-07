// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-03 RF-61: activos candidatos de la infraestructura al resolver |
// | 2026-10-31 | Arekkazu | TC-DIS-154 RF-61 a11y 1.3.1/2.4.6 + T-18: título según AMBIGUA/SIN_VINCULAR, sensor y área sin IDs |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { ModalShell } from './ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { CampoActivoCandidato, CampoModeloManejo, idDeTextoActivo } from './CamposVinculacion';
import { lecturaVinculada, tituloPorEstado, ubicacionVinculada } from '../lib/vinculacion';
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
  const [textoActivo, setTextoActivo] = useState('');
  const [modelo, setModelo] = useState(vinc.modelo_manejo ?? '');
  const [touched, setTouched] = useState(false);

  const idActivo = idDeTextoActivo(textoActivo);
  const faltaActivo = !(idActivo > 0);
  const faltaModelo = !modelo.trim();

  const confirmar = () => {
    setTouched(true);
    if (faltaActivo || faltaModelo) return;
    onConfirm({ id_activo_biologico: idActivo, modelo_manejo: modelo.trim() });
  };

  return (
    <ModalShell
      // T-18 / TC-DIS-154 2.4.6: el título dice si es AMBIGUA o SIN_VINCULAR, sin el número.
      title={t(`resolvervinculacionmodal.${tituloPorEstado(vinc.estado_vinculacion)}`)}
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>{t('resolvervinculacionmodal.cancelar')}</Button>
          <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={confirmar}>{t('resolvervinculacionmodal.confirmar_vinculacion')}</Button>
        </>
      }
    >
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 var(--s3)' }}>{t('resolvervinculacionmodal.asigna_el_activo_biologico_correcto_para_la')}:</p>
      {/* TC-DIS-154 1.3.1: la lectura que se resuelve, con sensor y área rotulados. */}
      <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s1)', fontSize: '13px', margin: '0 0 var(--s4)' }}>
        {([
          [t('resolvervinculacionmodal.lectura'), lecturaVinculada(vinc)],
          [t('resolvervinculacionmodal.sensor'), vinc.nombre_sensor ?? '—'],
          [t('resolvervinculacionmodal.area'), ubicacionVinculada(vinc)],
        ] as const).map(([rotulo, valor]) => (
          <div key={rotulo} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)' }}>
            <dt style={{ color: 'var(--text-muted)' }}>{rotulo}:</dt>
            <dd style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>{valor}</dd>
          </div>
        ))}
      </dl>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <CampoActivoCandidato id="rv-activo" idInfraestructura={vinc.id_infraestructura} value={textoActivo} onChange={setTextoActivo}
          error={touched && faltaActivo ? t('camposvinculacion.elige_un_activo') : undefined} />
      </div>

      <CampoModeloManejo id="rv-modelo" fijo={vinc.modelo_manejo} value={modelo} onChange={setModelo}
        error={touched && faltaModelo ? t('resolvervinculacionmodal.este_campo_es_obligatorio') : undefined} />

      {saveError && (
        <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={saveError.status === 403 ? t('resolvervinculacionmodal.sin_permiso_para_resolver') : t('resolvervinculacionmodal.no_se_pudo_resolver_la_vinculacion')} description={saveError.message} style={{ marginTop: 'var(--s4)' }} />
      )}
    </ModalShell>
  );
}
