import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL, errorServidor } from './formControls';
import { useTransferencias } from '../hooks/useTransferencias';
import type { RegistrarTransferenciaDTO } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  infraestructura_destino_id: string;
  fecha_transferencia: string;
  motivo_transferencia: string;
}

interface Props {
  idActivo: number;
  origenId: number | null;
  origenNombre: string | null;
  onClose: () => void;
  onDone: () => void;
}

const HOY = hoyLocal();

export function TransferenciaWizard({ idActivo, origenId, origenNombre, onClose, onDone }: Props) {
  const { t } = useT('biologicalAssets');
  const { disponibles, loadingDisponibles, errorDisponibles, saving, saveError, cargarDisponibles, registrar } = useTransferencias(idActivo);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { fecha_transferencia: HOY },
  });
  // Resumen origen → destino antes de enviar (TC-DIS-134).
  const [pendiente, setPendiente] = useState<RegistrarTransferenciaDTO | null>(null);
  const destinoPendiente = disponibles.find((d) => d.id_infraestructura === pendiente?.infraestructura_destino_id);

  const confirmar = async () => {
    if (!pendiente) return;
    const res = await registrar(pendiente);
    if (res) { onDone(); onClose(); } else setPendiente(null);
  };

  useEffect(() => { cargarDisponibles(); }, [cargarDisponibles]);

  const submit = async (v: FormValues) => {
    if (origenId == null) return;
    const dto: RegistrarTransferenciaDTO = {
      infraestructura_origen_id: origenId,
      infraestructura_destino_id: Number(v.infraestructura_destino_id),
      fecha_transferencia: v.fecha_transferencia,
      motivo_transferencia: v.motivo_transferencia.trim(),
    };
    setPendiente(dto);
  };

  return (
    <ModalShell title={t('transferenciawizard.transferencia_interna')} onClose={onClose} maxWidth={520}>
      {origenId == null && (
        <Alert
          variant="warning"
          title={t('transferenciawizard.sin_infraestructura_de_origen')}
          description={t('transferenciawizard.no_se_pudo_determinar_la_infraestructura')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('transferenciawizard.no_se_pudo_transferir')}
          description={saveError.status === 403 ? `Sin permiso de transferencia. ${saveError.message}` : saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {/* Origen → destino */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        <div style={{ padding: 'var(--s2) var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--text-primary)' }}>
          {origenNombre ?? (origenId != null ? `Infra #${origenId}` : '—')}
        </div>
        <ArrowRight size={16} aria-hidden style={{ color: 'var(--text-muted)' }} />
        <div style={{ padding: 'var(--s2) var(--s3)', background: 'var(--brand-50)', borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--brand-600)', fontWeight: 600 }}>{t('transferenciawizard.destino')}</div>
      </div>

      {pendiente ? (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>
            {t('transferenciawizard.confirma_la_transferencia')}
          </h3>
          <dl className="ds-fg2" style={{ gap: 'var(--s2) var(--s4)', margin: 0, fontSize: '13px' }}>
            <dt style={{ color: 'var(--text-muted)' }}>{t('transferenciawizard.origen')}</dt>
            <dd style={{ margin: 0 }}>{origenNombre ?? `Infra #${pendiente.infraestructura_origen_id}`}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>{t('transferenciawizard.destino')}</dt>
            <dd style={{ margin: 0 }}>{destinoPendiente ? `${destinoPendiente.nombre} · ${destinoPendiente.tipo}` : `Infra #${pendiente.infraestructura_destino_id}`}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>{t('transferenciawizard.fecha_de_transferencia')}</dt>
            <dd style={{ margin: 0 }}>{pendiente.fecha_transferencia}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>{t('transferenciawizard.motivo_de_la_transferencia')}</dt>
            <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{pendiente.motivo_transferencia}</dd>
          </dl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={() => setPendiente(null)} disabled={saving} autoFocus>{t('transferenciawizard.volver')}</Button>
            <Button type="button" variant="primary" size="md" loading={saving} onClick={confirmar}>{t('transferenciawizard.confirmar_transferencia')}</Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect
            label={t('transferenciawizard.infraestructura_destino')} required
            error={errors.infraestructura_destino_id?.message ?? errorServidor(saveError, 'infraestructura_destino_id')}
            aria-describedby="destinos-criterio"
            disabled={loadingDisponibles}
            {...register('infraestructura_destino_id', { required: t('transferenciawizard.selecciona_el_destino') })}
          >
            <option value="">
              {loadingDisponibles ? 'Cargando…' : 'Seleccionar destino…'}
            </option>
            {disponibles.map((d) => (
              <option key={d.id_infraestructura} value={d.id_infraestructura}>
                {d.nombre} · {d.tipo}{d.capacidad_maxima != null
                  ? ` (${t('transferenciawizard.ocupacion')}: ${d.ocupacion_actual ?? '?'}/${d.capacidad_maxima})`
                  : ''}
              </option>
            ))}
          </FormSelect>

          {/* E-07/E-08: los destinos incompatibles no aparecen; se explica por qué. */}
          <p id="destinos-criterio" style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {t('transferenciawizard.criterio_destinos')}
          </p>

          {errorDisponibles && (
            <Alert variant="warning" title={t('transferenciawizard.no_se_pudieron_cargar_los_destinos')} description={errorDisponibles.message} />
          )}
          {!loadingDisponibles && !errorDisponibles && disponibles.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('transferenciawizard.no_hay_infraestructuras_destino_compatibles')}</p>
          )}

          <Input
            label={t('transferenciawizard.fecha_de_transferencia')} required type="date" max={HOY}
            error={errors.fecha_transferencia?.message ?? errorServidor(saveError, 'fecha_transferencia')}
            {...register('fecha_transferencia', {
              required: t('transferenciawizard.la_fecha_es_obligatoria'),
              validate: (val) => val <= HOY || 'No puede ser posterior a hoy.',
            })}
          />

          <FormTextArea
            label={t('transferenciawizard.motivo_de_la_transferencia')} required
            error={errors.motivo_transferencia?.message ?? errorServidor(saveError, 'motivo_transferencia')}
            placeholder={t('transferenciawizard.describe_el_motivo')}
            {...register('motivo_transferencia', {
              required: t('transferenciawizard.el_motivo_es_obligatorio'),
              validate: (v) => v.trim().length > 0 || 'El motivo no puede estar vacío.',
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('transferenciawizard.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={origenId == null}>{t('transferenciawizard.transferir')}</Button>
        </div>
      </form>
      )}
    </ModalShell>
  );
}
