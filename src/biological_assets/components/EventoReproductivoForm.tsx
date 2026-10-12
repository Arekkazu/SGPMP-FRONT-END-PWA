import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { hoyLocal, instanteParaEvento } from '../../shared/lib/fecha';
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

/** Lo que exige el backend por categoría (registrar_evento_reproductivo_use_case). */
const REQUIEREN_PADRE: CategoriaReproductiva[] = ['servicio', 'inseminacion'];
const ADMITEN_PADRE: CategoriaReproductiva[] = ['servicio', 'inseminacion', 'parto', 'nacimiento'];
const REQUIEREN_CRIAS: CategoriaReproductiva[] = ['parto', 'aborto', 'nacimiento'];

interface Props {
  esPoblacional: boolean;
  candidatosPadre: { id: number; etiqueta: string }[];
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoReproductivoDTO) => Promise<boolean>;
}

export function EventoReproductivoForm({ esPoblacional, candidatosPadre, saving, saveError, onClose, onConfirmar }: Props) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { categoria: esPoblacional ? 'nacimiento' : 'inseminacion', resultado: 'exitoso', numero_crias: '1', fecha: hoyLocal() },
  });
  // #298 3.1b: cada categoría muestra solo sus campos.
  const categoria = watch('categoria');
  const pidePadre = !esPoblacional && ADMITEN_PADRE.includes(categoria);
  const padreObligatorio = REQUIEREN_PADRE.includes(categoria);
  const pideCrias = REQUIEREN_CRIAS.includes(categoria);

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoReproductivoDTO = {
      categoria: v.categoria,
      resultado: v.resultado,
      fecha: v.fecha ? instanteParaEvento(v.fecha) : null,
      id_padre: pidePadre && v.id_padre ? Number(v.id_padre) : null,
      // #298 3.3: en un individual el evento ya es de la madre; solo el lote la indica.
      id_madre: esPoblacional && v.id_madre ? Number(v.id_madre) : null,
      numero_crias: pideCrias ? Number(v.numero_crias) : 0,
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
      {!esPoblacional && (
        <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--s4)' }}>
          {t('eventoreproductivoform.secuencia')}
        </p>
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label={t('eventoreproductivoform.categoria')} required disabled={esPoblacional} {...register('categoria')}>
            {esPoblacional ? (
              <option value="nacimiento">{t('eventoreproductivoform.nacimiento')}</option>
            ) : (
              <>
                <option value="servicio">{t('eventoreproductivoform.servicio')}</option>
                <option value="inseminacion">{t('eventoreproductivoform.inseminacion')}</option>
                <option value="diagnostico">{t('eventoreproductivoform.diagnostico')}</option>
                <option value="parto">{t('eventoreproductivoform.parto')}</option>
                <option value="aborto">{t('eventoreproductivoform.aborto')}</option>
                <option value="nacimiento">{t('eventoreproductivoform.nacimiento')}</option>
              </>
            )}
          </FormSelect>

          <FormSelect label={t('eventoreproductivoform.resultado')} required {...register('resultado')}>
            <option value="exitoso">{t('eventoreproductivoform.exitoso')}</option>
            <option value="fallido">{t('eventoreproductivoform.fallido')}</option>
          </FormSelect>

          <Input label={t('eventoreproductivoform.fecha')} type="date" max={hoyLocal()} {...register('fecha')} />
          {pidePadre && (
            <Select
              id="evento-padre"
              label={t(padreObligatorio ? 'eventoreproductivoform.padre' : 'eventoreproductivoform.padre_de_la_cria')}
              required={padreObligatorio}
              hint={candidatosPadre.length === 0 ? t('eventoreproductivoform.sin_candidatos_padre') : undefined}
              error={errors.id_padre?.message}
              {...register('id_padre', {
                validate: (v) => !padreObligatorio || !!v || t('eventoreproductivoform.padre_obligatorio'),
              })}
            >
              <option value="">{padreObligatorio ? t('eventoreproductivoform.seleccionar') : t('eventoreproductivoform.sin_especificar')}</option>
              {candidatosPadre.map((c) => <option key={c.id} value={c.id}>{c.etiqueta}</option>)}
            </Select>
          )}
          {esPoblacional && (
            <Input label={t('eventoreproductivoform.id_madre')} type="number" min={1} placeholder={t('eventoreproductivoform.opcional')} {...register('id_madre')} />
          )}
          {pideCrias && (
            <Input
              label={t('eventoreproductivoform.numero_de_crias')} required type="number" min={1} step={1}
              error={errors.numero_crias?.message}
              {...register('numero_crias', {
                validate: (v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || t('eventoreproductivoform.al_menos_una_cria'),
              })}
            />
          )}
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
