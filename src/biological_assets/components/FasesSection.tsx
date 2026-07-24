import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { GitBranch, CheckCircle2, CircleDot } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useFases } from '../hooks/useFases';
import { ModalShell } from './ModalShell';
import { RECURSO_ACTIVOS, ACCION_E } from '../rbac';
import type { CambiarFaseDTO, GestionFaseResponse } from '../types';

interface Props {
  idActivo: number;
  onChanged: () => void;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 64,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  resize: 'vertical',
  outline: 'none',
};

function FaseItem({ fase, ultimo }: { fase: GestionFaseResponse; ultimo: boolean }) {
  const activa = fase.es_activa;
  return (
    <li style={{ display: 'flex', gap: 'var(--s3)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ color: activa ? 'var(--brand-500)' : 'var(--sem-success)', marginTop: 2 }}>
          {activa ? <CircleDot size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
        </span>
        {!ultimo && <span style={{ flex: 1, width: 2, background: 'var(--surface-border)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
            {fase.nombre_ciclo}
          </span>
          {activa && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-600)', background: 'var(--brand-50)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)' }}>
              ACTIVA
            </span>
          )}
        </div>
        {fase.nombre_fase_actual && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
            Fase: {fase.nombre_fase_actual}
            {fase.paso_actual != null && fase.total_pasos != null && ` (${fase.paso_actual}/${fase.total_pasos})`}
          </div>
        )}
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {fase.fecha_inicio?.slice(0, 10)}
          {fase.fecha_finalizacion ? ` → ${fase.fecha_finalizacion.slice(0, 10)}` : ' → en curso'}
        </div>
        {fase.motivo_cambio && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 'var(--s1)' }}>
            {fase.motivo_cambio}
          </div>
        )}
      </div>
    </li>
  );
}

interface FormValues {
  id_ciclo_productiva: string;
  motivo_cambio: string;
  fecha_inicio: string;
}

function CambiarFaseModal({
  saving, saveError, onClose, onConfirmar,
}: {
  saving: boolean;
  saveError: ReturnType<typeof useFases>['saveError'];
  onClose: () => void;
  onConfirmar: (dto: CambiarFaseDTO) => Promise<boolean>;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: { id_ciclo_productiva: '', motivo_cambio: '', fecha_inicio: '' },
  });

  const submit = async (v: FormValues) => {
    const ok = await onConfirmar({
      id_ciclo_productiva: Number(v.id_ciclo_productiva),
      motivo_cambio: v.motivo_cambio.trim() || null,
      fecha_inicio: v.fecha_inicio ? new Date(v.fecha_inicio).toISOString() : null,
    });
    if (ok) onClose();
  };

  return (
    <ModalShell title="Cambiar / avanzar fase" onClose={onClose}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title="No se pudo cambiar la fase"
          description={saveError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <Input
            label="ID del ciclo productivo" required type="number" min={1}
            placeholder="Ej: 3"
            hint="ID de la fase/ciclo destino del catálogo"
            error={errors.id_ciclo_productiva?.message}
            {...register('id_ciclo_productiva', {
              required: 'El ciclo productivo es obligatorio.',
              min: { value: 1, message: 'ID inválido.' },
            })}
          />
          <Input label="Fecha de inicio" type="date" {...register('fecha_inicio')} />
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }} htmlFor="motivo-fase">
              Motivo del cambio
            </label>
            <textarea id="motivo-fase" style={TEXTAREA} placeholder="Opcional" {...register('motivo_cambio')} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
          <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="primary" size="md" loading={saving}>Cambiar fase</Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function FasesSection({ idActivo, onChanged }: Props) {
  const online = useOnlineStatus();
  const puedeCambiar = usePermission(RECURSO_ACTIVOS, ACCION_E);
  const { fases, loading, saving, error, saveError, cargar, cambiarFase, setSaveError } = useFases(idActivo);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { cargar(); }, [cargar]);

  const handleConfirmar = async (dto: CambiarFaseDTO): Promise<boolean> => {
    const ok = await cambiarFase(dto);
    if (ok) { await cargar(); onChanged(); }
    return ok;
  };

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <GitBranch size={16} aria-hidden />
          Secuencia de fases
        </h3>
        {puedeCambiar && (
          <Button variant="primary" size="sm" disabled={!online} onClick={() => { setSaveError(null); setAbierto(true); }}>
            Cambiar fase
          </Button>
        )}
      </div>

      {error && <Alert variant="error" title="Error al cargar fases" description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ height: 120, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : fases.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Este activo no tiene fases registradas.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {fases.map((f, i) => (
            <FaseItem key={f.id_gestion_fases ?? i} fase={f} ultimo={i === fases.length - 1} />
          ))}
        </ul>
      )}

      {abierto && (
        <CambiarFaseModal
          saving={saving}
          saveError={saveError}
          onClose={() => setAbierto(false)}
          onConfirmar={handleConfirmar}
        />
      )}
    </div>
  );
}
