import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
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

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onConfirmar: (dto: RegistrarEventoSanitarioDTO) => Promise<boolean>;
}

export function EventoSanitarioForm({ saving, saveError, onClose, onConfirmar }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { tipo: 'DIAGNOSTICO', solicitar_estado: '' },
  });

  const tipo = watch('tipo');
  const requiereMedicamento = tipo === 'VACUNACION' || tipo === 'TRATAMIENTO';
  const esTratamiento = tipo === 'TRATAMIENTO';
  const esDiagnostico = tipo === 'DIAGNOSTICO';
  const esControl = tipo === 'CONTROL_PREVENTIVO';
  const permiteSolicitarEstado = tipo === 'TRATAMIENTO' || tipo === 'CONTROL_PREVENTIVO';

  const submit = async (v: FormValues) => {
    const dto: RegistrarEventoSanitarioDTO = {
      tipo: v.tipo,
      fecha: v.fecha ? new Date(v.fecha).toISOString() : null,
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
    <ModalShell title="Registrar evento sanitario" onClose={onClose} maxWidth={520}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo registrar"
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect label="Tipo" required {...register('tipo')}>
            <option value="DIAGNOSTICO">Diagnóstico</option>
            <option value="VACUNACION">Vacunación</option>
            <option value="TRATAMIENTO">Tratamiento</option>
            <option value="CONTROL_PREVENTIVO">Control preventivo</option>
          </FormSelect>

          {esDiagnostico && (
            <FormTextArea
              label="Diagnóstico" required error={errors.diagnostico?.message}
              placeholder="Describe el diagnóstico…"
              {...register('diagnostico', { required: 'El diagnóstico es obligatorio.' })}
            />
          )}

          {requiereMedicamento && (
            <>
              <Input
                label="Medicamento" required error={errors.medicamento?.message}
                placeholder="Ej: Aftovaxpur DOE"
                {...register('medicamento', { required: 'El medicamento es obligatorio.' })}
              />
              <Input
                label="Dosis" required type="number" min={0} step="0.01"
                error={errors.dosis?.message}
                {...register('dosis', {
                  required: 'La dosis es obligatoria.',
                  validate: (v) => Number(v) > 0 || 'Debe ser mayor a 0.',
                })}
              />
              <Input label="Unidad de dosis" placeholder="Ej: ml (opcional)" {...register('unidad_dosis')} />
            </>
          )}

          {esTratamiento && (
            <>
              <Input
                label="Frecuencia (veces/día)" required type="number" min={1}
                error={errors.frecuencia?.message}
                {...register('frecuencia', { required: 'La frecuencia es obligatoria para tratamiento.' })}
              />
              <Input
                label="Duración (días)" required type="number" min={1}
                error={errors.duracion?.message}
                {...register('duracion', { required: 'La duración es obligatoria para tratamiento.' })}
              />
            </>
          )}

          {esControl && (
            <FormTextArea
              label="Observaciones" required error={errors.observaciones?.message}
              placeholder="Observaciones del control…"
              {...register('observaciones', { required: 'Las observaciones son obligatorias.' })}
            />
          )}

          {permiteSolicitarEstado && (
            <FormSelect label="Solicitar cambio de estado" {...register('solicitar_estado')}>
              <option value="">No cambiar estado</option>
              <option value="EN_TRATAMIENTO">Marcar EN TRATAMIENTO</option>
              <option value="AISLADO">Marcar AISLADO</option>
            </FormSelect>
          )}

          <Input label="Fecha" type="date" {...register('fecha')} />
          <FormTextArea label="Descripción" placeholder="Opcional" {...register('descripcion')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>Registrar</Button>
        </div>
      </form>
    </ModalShell>
  );
}
