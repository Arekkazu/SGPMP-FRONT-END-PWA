import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X, Radio } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { DispositivoIotResponse, RegistrarSensorDTO, CategoriaSensor } from '../types';
import type { ApiError } from '../../shared/api/errors';

const CATEGORIAS: CategoriaSensor[] = ['HUMEDAD', 'TEMPERATURA', 'OXIGENO', 'PH', 'AMONIACO', 'SALINIDAD', 'LUMINOSIDAD'];

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  cursor: 'pointer',
};

interface FormValues {
  nombre: string;
  categoria: CategoriaSensor | '';
}

interface Props {
  dispositivo: DispositivoIotResponse;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (idDispositivo: number, dto: RegistrarSensorDTO) => Promise<boolean>;
}

export function SensorModal({ dispositivo, saving, saveError, onClose, onRegistrar }: Props) {
  const { t } = useT('configuration');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    reset({ nombre: '', categoria: '' });
  }, [reset]);

  const onSubmit = async (data: FormValues) => {
    const ok = await onRegistrar(dispositivo.id_dispositivo_iot, {
      nombre: data.nombre.trim(),
      categoria: data.categoria || undefined,
    });
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sensor-modal-title"
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
            <Radio size={18} color="var(--brand-500)" aria-hidden />
            <h2 id="sensor-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('sensormodal.registrar_sensor')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('sensormodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && (
            <Alert
              variant="error"
              title={t('sensormodal.error_al_registrar')}
              description={saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          {/* Dispositivo readonly */}
          <div style={{
            padding: 'var(--s3) var(--s4)', background: 'var(--surface-hover)',
            borderRadius: 'var(--r-md)', marginBottom: 'var(--s5)',
            border: '1px solid var(--surface-border)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s1)' }}>{t('sensormodal.dispositivo')}</div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {dispositivo.serial}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Nombre */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Input
                label={t('sensormodal.nombre_del_sensor')}
                required
                aria-required="true"
                placeholder={t('sensormodal.ej_sensor_ph_estanque_norte')}
                maxLength={100}
                error={errors.nombre?.message}
                {...register('nombre', {
                  required: t('sensormodal.el_nombre_del_sensor_es_obligatorio'),
                  maxLength: { value: 100, message: t('sensormodal.maximo_100_caracteres') },
                })}
              />
            </div>

            {/* Categoría */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('sensormodal.categoria')}</label>
              <select style={SELECT_STYLE} {...register('categoria')}>
                <option value="">{t('sensormodal.sin_categoria')}</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('sensormodal.cancelar')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>{t('sensormodal.registrar_sensor')}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
