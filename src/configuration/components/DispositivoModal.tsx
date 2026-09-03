import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X, Cpu } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { InfraestructuraResponse, RegistrarDispositivoIotDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface FormValues {
  serial: string;
  descripcion: string;
}

interface Props {
  area: InfraestructuraResponse;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarDispositivoIotDTO) => Promise<boolean>;
}

const SERIAL_REGEX = /^[A-Za-z0-9_\-]+$/;

export function DispositivoModal({ area, saving, saveError, onClose, onRegistrar }: Props) {
  const { t } = useT('configuration');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    reset({ serial: '', descripcion: '' });
  }, [reset]);

  useEffect(() => {
    if (saveError?.status === 409) {
      setError('serial', { message: 'Ya existe un dispositivo con este serial.' });
    }
  }, [saveError, setError]);

  const onSubmit = async (data: FormValues) => {
    const ok = await onRegistrar({
      serial: data.serial.trim().toUpperCase(),
      descripcion: data.descripcion.trim(),
      id_infraestructura: area.id_infraestructura,
    });
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disp-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1010,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        padding: 'var(--s6) var(--s4)', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--surface-border)', width: '100%', maxWidth: 480,
        boxShadow: 'var(--shadow-lg)', marginBottom: 'var(--s6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <Cpu size={18} color="var(--brand-500)" aria-hidden />
            <h2 id="disp-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dispositivomodal.registrar_dispositivo_iot')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('dispositivomodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && saveError.status !== 409 && (
            <Alert
              variant="error"
              title={t('dispositivomodal.error_al_registrar')}
              description={saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          {/* Área readonly */}
          <div style={{
            padding: 'var(--s3) var(--s4)', background: 'var(--surface-hover)',
            borderRadius: 'var(--r-md)', marginBottom: 'var(--s5)',
            border: '1px solid var(--surface-border)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{t('dispositivomodal.area_productiva_asignada')}</div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
              {area.tipo_area} — {area.nombre_infraestructura}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              #{area.id_infraestructura} · {area.superficie.toLocaleString('es-CO')} m²
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Serial */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('dispositivomodal.serial_fisico_del_dispositivo')}<span aria-hidden="true" style={{ color: 'var(--sem-error)' }}>*</span>
              </label>
              <input
                type="text"
                aria-required="true"
                placeholder={t('dispositivomodal.ej_sn_esp32_2024_001')}
                maxLength={50}
                style={{
                  width: '100%',
                  padding: 'var(--s3)',
                  borderRadius: 'var(--r-md)',
                  border: `1.5px solid ${errors.serial ? 'var(--sem-error)' : 'var(--surface-border)'}`,
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                {...register('serial', {
                  required: 'El serial del dispositivo es obligatorio.',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                  maxLength: { value: 50, message: 'Máximo 50 caracteres.' },
                  pattern: { value: SERIAL_REGEX, message: 'Solo letras, números, guiones y guiones bajos.' },
                })}
              />
              {errors.serial && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)', margin: 0 }}>
                  {errors.serial.message}
                </p>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('dispositivomodal.se_guardara_en_mayusculas_debe_ser_unico_en')}</p>
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <Input
                label={t('dispositivomodal.descripcion_tipo_modelo_o_referencia')}
                required
                aria-required="true"
                placeholder={t('dispositivomodal.ej_sensor_esp32_temperatura_humedad_modelo')}
                error={errors.descripcion?.message}
                {...register('descripcion', {
                  required: 'La descripción es obligatoria.',
                  minLength: { value: 5, message: 'Mínimo 5 caracteres.' },
                  maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('dispositivomodal.cancelar')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>{t('dispositivomodal.registrar_dispositivo')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
