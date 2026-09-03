import React, { useEffect } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X, MapPin } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { FincaResponse, RegistrarFincaDTO, EditarFincaDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface FormValues {
  nombre: string;
  tamano_h: number;
  id_usuario: string;
  departamento: string;
  municipio: string;
  vereda: string;
  latitud: number;
  longitud: number;
}

interface Props {
  finca: FincaResponse | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarFincaDTO) => Promise<boolean>;
  onEditar: (id: number, dto: EditarFincaDTO) => Promise<boolean>;
}

const NOMBRE_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;
const TEXTO_REGEX  = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 'var(--s4)',
};

export function FincaModal({ finca, saving, saveError, onClose, onRegistrar, onEditar }: Props) {
  const { t } = useT('configuration');
  const modoEditar = finca !== null;
  const titulo = modoEditar ? `Editar finca — ${finca.nombre}` : 'Registrar nueva finca';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    if (finca) {
      reset({
        nombre: finca.nombre,
        tamano_h: finca.tamano_h,
        id_usuario: finca.id_usuario != null ? String(finca.id_usuario) : '',
        departamento: finca.ubicacion.departamento,
        municipio: finca.ubicacion.municipio,
        vereda: finca.ubicacion.vereda,
        latitud: finca.ubicacion.latitud,
        longitud: finca.ubicacion.longitud,
      });
    } else {
      reset({ nombre: '', tamano_h: 0, id_usuario: '', departamento: '', municipio: '', vereda: '', latitud: 0, longitud: 0 });
    }
  }, [finca, reset]);

  const onSubmit = async (data: FormValues) => {
    const ubicacion = {
      departamento: data.departamento.trim(),
      municipio: data.municipio.trim(),
      vereda: data.vereda.trim(),
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
    };
    const id_usuario = data.id_usuario ? Number(data.id_usuario) : undefined;
    let ok: boolean;

    if (modoEditar && finca) {
      ok = await onEditar(finca.id_finca, {
        nombre: data.nombre.trim(),
        tamano_h: Number(data.tamano_h),
        ubicacion,
        id_usuario,
        fecha_actualizacion: finca.fecha_actualizacion,
      });
    } else {
      ok = await onRegistrar({ nombre: data.nombre.trim(), tamano_h: Number(data.tamano_h), ubicacion, id_usuario });
    }
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finca-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--s6) var(--s4)', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', width: '100%', maxWidth: 600, boxShadow: 'var(--shadow-lg)', marginBottom: 'var(--s6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 id="finca-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {titulo}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('fincamodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && (
            <Alert
              variant="error"
              title={saveError.status === 412 ? 'Conflicto de edición' : 'Error al guardar'}
              description={saveError.status === 412
                ? 'Otro usuario modificó esta finca. Recarga para ver los datos actuales antes de guardar.'
                : saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* SECCIÓN 1: Info general */}
            <div style={SECTION_LABEL}>{t('fincamodal.1_informacion_general')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
              <Input
                label={t('fincamodal.nombre_de_la_finca')}
                required
                aria-required="true"
                placeholder={t('fincamodal.ej_la_esperanza_el_palmar')}
                error={errors.nombre?.message}
                {...register('nombre', {
                  required: 'El nombre es obligatorio.',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                  maxLength: { value: 55, message: 'Máximo 55 caracteres.' },
                  pattern: { value: NOMBRE_REGEX, message: 'Solo letras, espacios y tildes.' },
                })}
              />
              <Input
                label="Tamaño (hectáreas)"
                type="number"
                required
                aria-required="true"
                placeholder="Ej: 25.50"
                error={errors.tamano_h?.message}
                {...register('tamano_h', {
                  required: 'El tamaño es obligatorio.',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Debe ser mayor a 0.' },
                })}
              />
              <Input
                label={t('fincamodal.id_productor_asignado')}
                type="number"
                placeholder={t('fincamodal.id_del_usuario_productor')}
                error={errors.id_usuario?.message}
                {...register('id_usuario', {
                  min: { value: 1, message: 'ID inválido.' },
                })}
              />
            </div>

            {/* SECCIÓN 2: Ubicación */}
            <div style={SECTION_LABEL}>{t('fincamodal.2_ubicacion_geografica')}</div>
            <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginBottom: 'var(--s6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s4)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <MapPin size={14} color="var(--brand-500)" aria-hidden />{t('fincamodal.datos_de_ubicacion_administrativa_y')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                <Input
                  label={t('fincamodal.departamento')}
                  required
                  aria-required="true"
                  placeholder={t('fincamodal.ej_antioquia')}
                  error={errors.departamento?.message}
                  {...register('departamento', {
                    required: 'Requerido.',
                    validate: (v) => !!v.trim() || 'Requerido.',
                    maxLength: { value: 60, message: 'Máx. 60 caracteres.' },
                    pattern: { value: TEXTO_REGEX, message: 'Solo letras y espacios.' },
                  })}
                />
                <Input
                  label={t('fincamodal.municipio')}
                  required
                  aria-required="true"
                  placeholder={t('fincamodal.ej_rionegro')}
                  error={errors.municipio?.message}
                  {...register('municipio', {
                    required: 'Requerido.',
                    validate: (v) => !!v.trim() || 'Requerido.',
                    maxLength: { value: 60, message: 'Máx. 60 caracteres.' },
                    pattern: { value: TEXTO_REGEX, message: 'Solo letras y espacios.' },
                  })}
                />
                <Input
                  label={t('fincamodal.vereda')}
                  required
                  aria-required="true"
                  placeholder={t('fincamodal.ej_la_mosquitera')}
                  error={errors.vereda?.message}
                  {...register('vereda', {
                    required: 'Requerido.',
                    validate: (v) => !!v.trim() || 'Requerido.',
                    maxLength: { value: 60, message: 'Máx. 60 caracteres.' },
                    pattern: { value: TEXTO_REGEX, message: 'Solo letras y espacios.' },
                  })}
                />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--s4)' }}>
                Solo letras (A–Z, tildes, ñ) y espacios. Sin números ni símbolos.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                <div>
                  <Input
                    label={t('fincamodal.latitud')}
                    type="number"
                    required
                    aria-required="true"
                    placeholder="Ej: 6.152438"
                    error={errors.latitud?.message}
                    {...register('latitud', {
                      required: 'Requerida.',
                      valueAsNumber: true,
                      min: { value: -90, message: 'Mín. -90.' },
                      max: { value: 90,  message: 'Máx. 90.' },
                    })}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('fincamodal.rango_90_a_90')}</p>
                </div>
                <div>
                  <Input
                    label={t('fincamodal.longitud')}
                    type="number"
                    required
                    aria-required="true"
                    placeholder="Ej: -75.374908"
                    error={errors.longitud?.message}
                    {...register('longitud', {
                      required: 'Requerida.',
                      valueAsNumber: true,
                      min: { value: -180, message: 'Mín. -180.' },
                      max: { value: 180,  message: 'Máx. 180.' },
                    })}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{t('fincamodal.rango_180_a_180')}</p>
                </div>
              </div>
            </div>

            {/* Fechas (readonly, solo en editar) */}
            {modoEditar && finca && (
              <>
                <div style={SECTION_LABEL}>{t('fincamodal.3_fechas_del_registro')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s5)', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{t('fincamodal.creado')}</div>
                    <div>{finca.fecha_creacion ? formatearFechaHora(finca.fecha_creacion) : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{t('fincamodal.actualizado')}</div>
                    <div>{finca.fecha_actualizacion ? formatearFechaHora(finca.fecha_actualizacion) : '—'}</div>
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('fincamodal.cancelar')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>
                {modoEditar ? 'Guardar cambios' : 'Registrar finca'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
