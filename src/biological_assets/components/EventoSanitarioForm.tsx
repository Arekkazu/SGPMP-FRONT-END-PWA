// | Fecha      | Nombre       | Que se hizo                                                        |
// |------------|--------------|--------------------------------------------------------------------|
// | 2026-10-21 | destroyerban | #71 RF-41: bloquea tratamiento/vacunación sin diagnóstico previo   |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { hoyLocal, instanteParaEvento } from '../../shared/lib/fecha';
import { ModalShell } from './ModalShell';
import { AnuncioCampos, FormSelect, FormTextArea, FORM_COL } from './formControls';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarEventoSanitarioDTO, TipoEventoSanitario } from '../types';

interface FormValues {
  tipo: TipoEventoSanitario;
  diagnostico: string;
  medicamento: string;
  dosis: string;
  unidad_dosis: string;
  frecuencia: string;
  duracion: string;
  observaciones: string;
  fecha: string;
  descripcion: string;
  solicitar_estado: '' | 'EN_TRATAMIENTO' | 'AISLADO';
}

/**
 * #71 (RF-41): si el activo ya tiene un DIAGNOSTICO en su historial. `desconocido`
 * (no se pudo consultar) no bloquea: la regla la sigue aplicando el backend (422).
 */
export type DiagnosticoPrevio = 'cargando' | 'si' | 'no' | 'desconocido';

/** RF-41: "No se permite registrar eventos de tratamiento y/o vacunación sin un evento previo de diagnóstico". */
const TIPOS_REQUIEREN_DIAGNOSTICO: TipoEventoSanitario[] = ['TRATAMIENTO', 'VACUNACION'];

interface Props {
  patologias: { id_patologia: number; nombre: string }[];
  patologiasLoading: boolean;
  diagnosticoPrevio?: DiagnosticoPrevio;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoSanitarioDTO) => Promise<boolean>;
}

export function EventoSanitarioForm({
  patologias, patologiasLoading, diagnosticoPrevio = 'desconocido', saving, saveError, onClose, onConfirmar,
}: Props) {
  const { t } = useT('biologicalAssets');
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { tipo: 'DIAGNOSTICO', solicitar_estado: '', fecha: hoyLocal() },
  });

  const tipo = watch('tipo');
  const requiereMedicamento = tipo === 'VACUNACION' || tipo === 'TRATAMIENTO';
  const esTratamiento = tipo === 'TRATAMIENTO';
  const esDiagnostico = tipo === 'DIAGNOSTICO';
  const esControl = tipo === 'CONTROL_PREVENTIVO';
  const permiteSolicitarEstado = tipo === 'TRATAMIENTO' || tipo === 'CONTROL_PREVENTIVO';
  const requiereDiagnostico = TIPOS_REQUIEREN_DIAGNOSTICO.includes(tipo);
  const sinDiagnostico = requiereDiagnostico && diagnosticoPrevio === 'no';
  const verificandoDiagnostico = requiereDiagnostico && diagnosticoPrevio === 'cargando';
  const camposVisibles = [
    esDiagnostico && t('eventosanitarioform.diagnostico'),
    requiereMedicamento && `${t('eventosanitarioform.medicamento')}, ${t('eventosanitarioform.dosis')}`,
    esTratamiento && 'Frecuencia, Duración',
    esControl && t('eventosanitarioform.observaciones'),
    permiteSolicitarEstado && t('eventosanitarioform.solicitar_cambio_de_estado'),
  ].filter(Boolean).join(', ');

  const submit = async (v: FormValues) => {
    if (sinDiagnostico || verificandoDiagnostico) return;
    const dto: RegistrarEventoSanitarioDTO = {
      tipo: v.tipo,
      fecha: v.fecha ? instanteParaEvento(v.fecha) : null,
      descripcion: v.descripcion.trim() || null,
    };
    if (esDiagnostico) dto.diagnostico = v.diagnostico.trim();
    if (requiereMedicamento) {
      dto.medicamento = v.medicamento.trim();
      dto.dosis = v.dosis ? Number(v.dosis) : null;
      dto.unidad_dosis = v.unidad_dosis.trim() || null;
    }
    if (esTratamiento) {
      dto.frecuencia = v.frecuencia ? Number(v.frecuencia) : null;
      dto.duracion = v.duracion ? Number(v.duracion) : null;
    }
    if (esControl) dto.observaciones = v.observaciones.trim();
    if (permiteSolicitarEstado && v.solicitar_estado) dto.solicitar_estado = v.solicitar_estado;

    const ok = await onConfirmar(dto);
    if (ok) onClose();
  };

  return (
    <ModalShell title={t('eventosanitarioform.registrar_evento_sanitario')} onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('eventosanitarioform.no_se_pudo_registrar')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <AnuncioCampos texto={camposVisibles ? `${t('eventosanitarioform.campos_para_el_tipo')}: ${camposVisibles}` : ''} />
        <div style={FORM_COL}>
          <FormSelect label={t('eventosanitarioform.tipo')} required {...register('tipo')}>
            <option value="DIAGNOSTICO">{t('eventosanitarioform.diagnostico')}</option>
            <option value="VACUNACION">{t('eventosanitarioform.vacunacion')}</option>
            <option value="TRATAMIENTO">{t('eventosanitarioform.tratamiento')}</option>
            <option value="CONTROL_PREVENTIVO">{t('eventosanitarioform.control_preventivo')}</option>
          </FormSelect>

          {sinDiagnostico && (
            <div>
              <Alert
                variant="warning"
                title={t('eventosanitarioform.requiere_diagnostico_titulo')}
                description={t('eventosanitarioform.requiere_diagnostico_detalle')}
                style={{ marginBottom: 'var(--s3)' }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => setValue('tipo', 'DIAGNOSTICO')}>
                {t('eventosanitarioform.registrar_diagnostico')}
              </Button>
            </div>
          )}
          {verificandoDiagnostico && (
            <p role="status" style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              {t('eventosanitarioform.verificando_diagnostico')}
            </p>
          )}

          {esDiagnostico && (
            <FormSelect
              label={t('eventosanitarioform.diagnostico')}
              required
              error={errors.diagnostico?.message}
              disabled={patologiasLoading || patologias.length === 0}
              {...register('diagnostico', {
                required: t('eventosanitarioform.el_diagnostico_es_obligatorio'),
              })}
            >
              <option value="">
                {patologiasLoading ? 'Cargando patologías…' : patologias.length ? 'Seleccionar patología' : 'No hay patologías configuradas'}
              </option>
              {patologias.map((patologia) => (
                <option key={patologia.id_patologia} value={patologia.nombre}>
                  {patologia.nombre}
                </option>
              ))}
            </FormSelect>
          )}

          {requiereMedicamento && (
            <>
              <Input
                label={t('eventosanitarioform.medicamento')} required error={errors.medicamento?.message}
                placeholder={t('eventosanitarioform.ej_aftovaxpur_doe')}
                {...register('medicamento', { required: t('eventosanitarioform.el_medicamento_es_obligatorio') })}
              />
              <Input
                label={t('eventosanitarioform.dosis')} required type="number" min={0} step="0.01"
                error={errors.dosis?.message}
                {...register('dosis', {
                  required: t('eventosanitarioform.la_dosis_es_obligatoria'),
                  validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
                })}
              />
              <Input label={t('eventosanitarioform.unidad_de_dosis')} placeholder="Ej: ml (opcional)" {...register('unidad_dosis')} />
            </>
          )}

          {esTratamiento && (
            <>
              <Input
                label="Frecuencia (veces/día)" required type="number" min={1}
                error={errors.frecuencia?.message}
                {...register('frecuencia', { required: t('eventosanitarioform.la_frecuencia_es_obligatoria_para') })}
              />
              <Input
                label="Duración (días)" required type="number" min={1}
                error={errors.duracion?.message}
                {...register('duracion', { required: t('eventosanitarioform.la_duracion_es_obligatoria_para_tratamiento') })}
              />
            </>
          )}

          {esControl && (
            <FormTextArea
              label={t('eventosanitarioform.observaciones')} required error={errors.observaciones?.message}
              placeholder={t('eventosanitarioform.observaciones_del_control')}
              {...register('observaciones', { required: t('eventosanitarioform.las_observaciones_son_obligatorias') })}
            />
          )}

          {permiteSolicitarEstado && (
            <FormSelect label={t('eventosanitarioform.solicitar_cambio_de_estado')} {...register('solicitar_estado')}>
              <option value="">{t('eventosanitarioform.no_cambiar_estado')}</option>
              <option value="EN_TRATAMIENTO">{t('eventosanitarioform.marcar_en_tratamiento')}</option>
              <option value="AISLADO">{t('eventosanitarioform.marcar_aislado')}</option>
            </FormSelect>
          )}

          <Input label={t('eventosanitarioform.fecha')} type="date" max={hoyLocal()} {...register('fecha')} />
          <FormTextArea label={t('eventosanitarioform.descripcion')} placeholder={t('eventosanitarioform.opcional')} {...register('descripcion')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('eventosanitarioform.cancelar')}</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={sinDiagnostico || verificandoDiagnostico}>
            {t('eventosanitarioform.registrar')}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
