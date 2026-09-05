import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import type { ApiError } from '../../shared/api/errors';
import type { ActivoBiologicoResponse, ActualizarActivoIndividualDTO } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  raza: string;
  sexo: string;
  fecha_nacimiento: string;
  peso_inicial: string;
}

interface Props {
  activo: ActivoBiologicoResponse;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onGuardar: (dto: ActualizarActivoIndividualDTO) => Promise<boolean>;
}

const SELECT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  height: 44,
  cursor: 'pointer',
};

const HOY = hoyLocal();

export function EditarActivoModal({ activo, saving, saveError, onClose, onGuardar }: Props) {
  const { t } = useT('biologicalAssets');
  const det = activo.detalle_individual;
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      raza: det?.raza ?? '',
      sexo: det?.sexo ?? '',
      fecha_nacimiento: det?.fecha_nacimiento ? det.fecha_nacimiento.slice(0, 10) : '',
      peso_inicial: det?.peso_inicial != null ? String(det.peso_inicial) : '',
    },
  });

  const submit = async (v: FormValues) => {
    setFormError(null);
    const dto: ActualizarActivoIndividualDTO = {};
    if (v.raza.trim()) dto.raza = v.raza.trim();
    if (v.sexo) dto.sexo = v.sexo;
    if (v.fecha_nacimiento) dto.fecha_nacimiento = new Date(v.fecha_nacimiento).toISOString();
    if (v.peso_inicial !== '') dto.peso_inicial = Number(v.peso_inicial);

    if (Object.keys(dto).length === 0) {
      setFormError('Debes modificar al menos un campo.');
      return;
    }
    const ok = await onGuardar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title={`Editar activo — ${activo.identificador ?? `#${activo.id_activo_biologico}`}`} onClose={onClose}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('editaractivomodal.no_se_pudo_guardar')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {formError && (
        <Alert variant="warning" title={t('editaractivomodal.revisa_el_formulario')} description={formError} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <Input label={t('editaractivomodal.raza')} placeholder={t('editaractivomodal.ej_holstein')} error={errors.raza?.message} {...register('raza')} />

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="edit-sexo">{t('editaractivomodal.sexo')}</label>
            <select id="edit-sexo" style={SELECT} {...register('sexo')}>
              <option value="">{t('editaractivomodal.sin_especificar')}</option>
              <option value="MACHO">{t('editaractivomodal.macho')}</option>
              <option value="HEMBRA">{t('editaractivomodal.hembra')}</option>
            </select>
          </div>

          <Input
            label={t('editaractivomodal.fecha_de_nacimiento')} type="date" max={HOY}
            error={errors.fecha_nacimiento?.message}
            {...register('fecha_nacimiento', {
              validate: (val) => !val || val <= HOY || 'No puede ser una fecha futura.',
            })}
          />
          <Input label="Peso inicial (kg)" type="number" min={0} step="0.01" placeholder={t('editaractivomodal.opcional')} {...register('peso_inicial')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('editaractivomodal.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('editaractivomodal.guardar_cambios')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
