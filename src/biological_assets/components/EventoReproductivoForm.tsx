import React from 'react';
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
    <ModalShell title="Registrar evento reproductivo" onClose={onClose} maxWidth={520}>
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
          <FormSelect label="Categoría" required {...register('categoria')}>
            <option value="servicio">Servicio</option>
            <option value="inseminacion">Inseminación</option>
            <option value="diagnostico">Diagnóstico</option>
            <option value="parto">Parto</option>
            <option value="aborto">Aborto</option>
            <option value="nacimiento">Nacimiento</option>
          </FormSelect>

          <FormSelect label="Resultado" required {...register('resultado')}>
            <option value="exitoso">Exitoso</option>
            <option value="fallido">Fallido</option>
          </FormSelect>

          <Input label="Fecha" type="date" {...register('fecha')} />
          <Input label="ID padre" type="number" min={1} placeholder="Opcional" {...register('id_padre')} />
          <Input label="ID madre" type="number" min={1} placeholder="Opcional" {...register('id_madre')} />
          <Input label="Número de crías" type="number" min={0} {...register('numero_crias')} />
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
