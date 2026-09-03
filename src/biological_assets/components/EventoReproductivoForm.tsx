import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoReproductivoDTO, CategoriaReproductiva, ResultadoReproductivo } from '../types';

interface FormValues {
  categoria: CategoriaReproductiva;
  resultado: ResultadoReproductivo;
  fecha: string;
  id_padre: string;
  id_madre: string;
  numero_crias: string;
  descripcion: string;
}

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoReproductivoDTO) => Promise<boolean>;
}

export function EventoReproductivoForm({ saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { categoria: 'inseminacion', resultado: 'exitoso', numero_crias: '0' },
  });

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoReproductivoDTO = {
      categoria: v.categoria,
      resultado: v.resultado,
      fecha: v.fecha ? new Date(v.fecha).toISOString() : null,
      id_padre: v.id_padre ? Number(v.id_padre) : null,
      id_madre: v.id_madre ? Number(v.id_madre) : null,
      numero_crias: v.numero_crias ? Number(v.numero_crias) : 0,
      descripcion: v.descripcion.trim() || null,
    };
    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title={t('eventoreproductivoform.registrar_evento_reproductivo')} onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('eventoreproductivoform.no_se_pudo_registrar')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label={t('eventoreproductivoform.categoria')} required {...register('categoria')}>
            <option value="servicio">{t('eventoreproductivoform.servicio')}</option>
            <option value="inseminacion">{t('eventoreproductivoform.inseminacion')}</option>
            <option value="diagnostico">{t('eventoreproductivoform.diagnostico')}</option>
            <option value="parto">{t('eventoreproductivoform.parto')}</option>
            <option value="aborto">{t('eventoreproductivoform.aborto')}</option>
            <option value="nacimiento">{t('eventoreproductivoform.nacimiento')}</option>
          </FormSelect>

          <FormSelect label={t('eventoreproductivoform.resultado')} required {...register('resultado')}>
            <option value="exitoso">{t('eventoreproductivoform.exitoso')}</option>
            <option value="fallido">{t('eventoreproductivoform.fallido')}</option>
          </FormSelect>

          <Input label={t('eventoreproductivoform.fecha')} type="date" {...register('fecha')} />
          <Input label={t('eventoreproductivoform.id_padre')} type="number" min={1} placeholder={t('eventoreproductivoform.opcional')} {...register('id_padre')} />
          <Input label={t('eventoreproductivoform.id_madre')} type="number" min={1} placeholder={t('eventoreproductivoform.opcional')} {...register('id_madre')} />
          <Input label={t('eventoreproductivoform.numero_de_crias')} type="number" min={0} {...register('numero_crias')} />
          <FormTextArea label={t('eventoreproductivoform.descripcion')} placeholder={t('eventoreproductivoform.opcional')} {...register('descripcion')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('eventoreproductivoform.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>{t('eventoreproductivoform.registrar')}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
