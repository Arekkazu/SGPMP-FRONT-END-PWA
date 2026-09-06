import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { X, AlertTriangle, CheckCircle, Lock, Unlock, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { useUsuarioDetalle } from '../hooks/useUsuarioDetalle';
import type { AccionCuenta } from '../types';

interface Props {
  idUsuario: number;
  nombreUsuario: string;
  estadoActual: string;
  onClose: () => void;
  onDone: () => void;
}

interface FormFields {
  motivo_accion: string;
}

interface OpcionAccion {
  value: AccionCuenta;
  label: string;
  descripcion: string;
  variante: 'primary' | 'danger' | 'secondary';
  icon: React.ReactNode;
  requiresMotivo: boolean;
}

const REQUIERE_MOTIVO: AccionCuenta[] = ['inactivar', 'bloquear', 'eliminar'];

function getAccionesDisponibles(estadoActual: string): OpcionAccion[] {
  const estado = estadoActual.toUpperCase();
  const acciones: OpcionAccion[] = [];

  if (['INACTIVO', 'BLOQUEADO', 'PENDIENTE'].includes(estado)) {
    acciones.push({
      value: 'activar',
      label: 'Activar',
      descripcion: 'El usuario podrá acceder al sistema nuevamente.',
      variante: 'primary',
      icon: <CheckCircle size={14} aria-hidden />,
      requiresMotivo: false,
    });
  }

  if (estado === 'ACTIVO') {
    acciones.push({
      value: 'inactivar',
      label: 'Inactivar',
      descripcion: 'El usuario perderá acceso inmediatamente. Las sesiones activas se cerrarán.',
      variante: 'secondary',
      icon: <Lock size={14} aria-hidden />,
      requiresMotivo: true,
    });
    acciones.push({
      value: 'bloquear',
      label: 'Bloquear',
      descripcion: 'El usuario no podrá acceder. Sus sesiones activas se cerrarán.',
      variante: 'secondary',
      icon: <Lock size={14} aria-hidden />,
      requiresMotivo: true,
    });
  }

  acciones.push({
    value: 'eliminar',
    label: 'Eliminar',
    descripcion: 'El usuario quedará marcado como ELIMINADO. Esta acción es irreversible.',
    variante: 'danger',
    icon: <Trash2 size={14} aria-hidden />,
    requiresMotivo: true,
  });

  return acciones;
}

export function GestionarModal({ idUsuario, nombreUsuario, estadoActual, onClose, onDone }: Props) {
  const { t } = useT('usuarios');
  const [accionSeleccionada, setAccionSeleccionada] = useState<AccionCuenta | null>(null);
  const { saving, saveError, gestionar } = useUsuarioDetalle();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormFields>({ mode: 'onBlur' });

  const acciones = getAccionesDisponibles(estadoActual);
  const opcionActual = acciones.find((a) => a.value === accionSeleccionada) ?? null;
  const necesitaMotivo = opcionActual?.requiresMotivo ?? false;

  const handleSeleccionar = (accion: AccionCuenta) => {
    if (accionSeleccionada === accion) {
      setAccionSeleccionada(null);
      reset();
    } else {
      setAccionSeleccionada(accion);
      reset();
    }
  };

  const onSubmit = async (data: FormFields) => {
    if (!accionSeleccionada) return;
    const ok = await gestionar(idUsuario, {
      accion_cuenta: accionSeleccionada,
      motivo_accion: data.motivo_accion || undefined,
    });
    if (ok) onDone();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gestionar-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(3px)',
        padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--surface-card)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--surface-border)',
          padding: 'var(--s6)',
          width: '100%',
          maxWidth: 480,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
          <h2 id="gestionar-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('gestionarmodal.gestionar_cuenta')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('gestionarmodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>
          Usuario: <strong style={{ color: 'var(--text-primary)' }}>{nombreUsuario}</strong>
        </p>

        {saveError && (
          <Alert variant="error" title={t('gestionarmodal.error')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('gestionarmodal.selecciona_la_accion')}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
            {acciones.map(({ value, label, descripcion, variante, icon }) => {
              const seleccionado = accionSeleccionada === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSeleccionar(value)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--s3)',
                    padding: 'var(--s3) var(--s4)',
                    borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${seleccionado
                      ? (variante === 'danger' ? 'var(--sem-error)' : 'var(--brand-400)')
                      : 'var(--surface-border)'}`,
                    background: seleccionado
                      ? (variante === 'danger' ? 'var(--sem-error-bg)' : 'var(--brand-50)')
                      : 'var(--surface-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                  }}
                  aria-pressed={seleccionado}
                >
                  <span style={{ color: variante === 'danger' ? 'var(--sem-error)' : seleccionado ? 'var(--brand-600)' : 'var(--text-muted)', marginTop: 2, flexShrink: 0 }}>
                    {icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: variante === 'danger' ? 'var(--sem-error)' : 'var(--text-primary)', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{descripcion}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {accionSeleccionada === 'eliminar' && (
            <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'flex-start', padding: 'var(--s3)', background: 'var(--sem-error-bg)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s4)', border: '1px solid var(--sem-error-border)' }}>
              <AlertTriangle size={16} color="var(--sem-error)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
              <p style={{ fontSize: '13px', color: 'var(--sem-error)', margin: 0 }}>{t('gestionarmodal.esta_accion_eliminara_la_cuenta_de_forma')}</p>
            </div>
          )}

          {necesitaMotivo && (
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Input
                label={t('gestionarmodal.motivo')}
                required
                placeholder={t('gestionarmodal.describe_el_motivo_de_la_accion')}
                error={errors.motivo_accion?.message}
                {...register('motivo_accion', { required: t('gestionarmodal.el_motivo_es_obligatorio_para_esta_accion') })}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s5)', marginTop: 'var(--s2)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose}>{t('gestionarmodal.cancelar')}</Button>
            <Button
              type="submit"
              variant={accionSeleccionada === 'eliminar' ? 'danger' : 'primary'}
              size="md"
              loading={saving}
              disabled={!accionSeleccionada}
            >
              {accionSeleccionada
                ? `Confirmar ${acciones.find((a) => a.value === accionSeleccionada)?.label ?? ''}`
                : 'Confirmar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
