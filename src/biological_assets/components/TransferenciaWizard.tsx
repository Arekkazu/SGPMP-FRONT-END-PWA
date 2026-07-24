import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { FormSelect, FormTextArea, FORM_COL } from './formControls';
import { useTransferencias } from '../hooks/useTransferencias';
import type { RegistrarTransferenciaDTO } from '../types';

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

const HOY = new Date().toISOString().slice(0, 10);

export function TransferenciaWizard({ idActivo, origenId, origenNombre, onClose, onDone }: Props) {
  const { disponibles, loadingDisponibles, errorDisponibles, saving, saveError, cargarDisponibles, registrar } = useTransferencias(idActivo);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { fecha_transferencia: HOY },
  });

  useEffect(() => { cargarDisponibles(); }, [cargarDisponibles]);

  const submit = async (v: FormValues) => {
    if (origenId == null) return;
    const dto: RegistrarTransferenciaDTO = {
      infraestructura_origen_id: origenId,
      infraestructura_destino_id: Number(v.infraestructura_destino_id),
      fecha_transferencia: v.fecha_transferencia,
      motivo_transferencia: v.motivo_transferencia.trim(),
    };
    const res = await registrar(dto);
    if (res) { onDone(); onClose(); }
  };

  return (
    <ModalShell title="Transferencia interna" onClose={onClose} maxWidth={520}>
      {origenId == null && (
        <Alert
          variant="warning"
          title="Sin infraestructura de origen"
          description="No se pudo determinar la infraestructura actual del activo. Recarga la asociación e intenta de nuevo."
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo transferir"
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
        <div style={{ padding: 'var(--s2) var(--s3)', background: 'var(--brand-50)', borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--brand-600)', fontWeight: 600 }}>
          Destino
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={FORM_COL}>
          <FormSelect
            label="Infraestructura destino" required error={errors.infraestructura_destino_id?.message}
            disabled={loadingDisponibles}
            {...register('infraestructura_destino_id', { required: 'Selecciona el destino.' })}
          >
            <option value="">
              {loadingDisponibles ? 'Cargando…' : 'Seleccionar destino…'}
            </option>
            {disponibles.map((d) => (
              <option key={d.id_infraestructura} value={d.id_infraestructura}>
                {d.nombre} · {d.tipo}{d.capacidad_maxima != null ? ` (cap. ${d.capacidad_maxima})` : ''}
              </option>
            ))}
          </FormSelect>

          {errorDisponibles && (
            <Alert variant="warning" title="No se pudieron cargar los destinos" description={errorDisponibles.message} />
          )}
          {!loadingDisponibles && !errorDisponibles && disponibles.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              No hay infraestructuras destino compatibles disponibles.
            </p>
          )}

          <Input
            label="Fecha de transferencia" required type="date" max={HOY}
            error={errors.fecha_transferencia?.message}
            {...register('fecha_transferencia', {
              required: 'La fecha es obligatoria.',
              validate: (val) => val <= HOY || 'No puede ser posterior a hoy.',
            })}
          />

          <FormTextArea
            label="Motivo de la transferencia" required error={errors.motivo_transferencia?.message}
            placeholder="Describe el motivo…"
            {...register('motivo_transferencia', {
              required: 'El motivo es obligatorio.',
              validate: (v) => v.trim().length > 0 || 'El motivo no puede estar vacío.',
            })}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" size="md" loading={saving} disabled={origenId == null}>
            Transferir
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
