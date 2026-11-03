// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-20 | Arekkazu | FE-05 RF-15: densidad (ind/m²) y esperanza de vida (días), opcionales |
import React, { useEffect } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { GRUPOS_MANEJO, type EditarEspecieDTO, type EspecieResponse, type GrupoManejo, type RegistrarEspecieDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useErroresDeServidor } from '../../shared/hooks/useErroresDeServidor';

interface FormValues {
  nombre: string;
  descripcion: string;
  grupo_manejo: GrupoManejo | '';
  densidad_poblacional_max: string;
  esperanza_vida_dias: string;
}

const CAMPOS = ['nombre', 'descripcion', 'grupo_manejo', 'densidad_poblacional_max', 'esperanza_vida_dias'] as const;

// RFC-012: ind/m², positiva y con máximo 2 decimales (numeric(6,2) en la ficha).
const DENSIDAD_REGEX = /^\d+(\.\d{1,2})?$/;

function textoDe(valor: number | string | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(Number(valor));
}

interface Props {
  especie: EspecieResponse | null;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarEspecieDTO) => Promise<boolean>;
  onEditar: (id: number, dto: EditarEspecieDTO) => Promise<boolean>;
}

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  resize: 'vertical',
  outline: 'none',
};

const NOMBRE_REGEX = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s]+$/;

export function EspeciesModal({ especie, saving, saveError, onClose, onRegistrar, onEditar }: Props) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const modoEditar = especie !== null;
  const titulo = modoEditar ? `Editar especie — ${especie.nombre}` : 'Nueva especie';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });
  const alertaGeneral = useErroresDeServidor(saveError, setError, CAMPOS);

  const descValue = watch('descripcion', '');

  useEffect(() => {
    if (especie) {
      reset({
        nombre: especie.nombre,
        descripcion: especie.descripcion ?? '',
        grupo_manejo: especie.grupo_manejo ?? '',
        densidad_poblacional_max: textoDe(especie.densidad_poblacional_max ?? especie.densidad_maxima_por_especie),
        esperanza_vida_dias: textoDe(especie.esperanza_vida_dias),
      });
    } else {
      reset({ nombre: '', descripcion: '', grupo_manejo: '', densidad_poblacional_max: '', esperanza_vida_dias: '' });
    }
  }, [especie, reset]);

  const onSubmit = async (data: FormValues) => {
    const descripcion = data.descripcion.trim() || undefined;
    // La validación del formulario garantiza que no llegue vacío (RF-15 v1.1: obligatorio).
    const grupo_manejo = data.grupo_manejo as GrupoManejo;
    // Vacío viaja como null: en la edición borra el valor (RFC-012/014, ambos opcionales).
    const densidad_poblacional_max = data.densidad_poblacional_max.trim() || null;
    const esperanza_vida_dias = data.esperanza_vida_dias.trim() ? Number(data.esperanza_vida_dias) : null;
    let ok: boolean;

    if (modoEditar && especie) {
      ok = await onEditar(especie.id_especie, {
        nombre: data.nombre.trim(),
        descripcion,
        grupo_manejo,
        densidad_poblacional_max,
        esperanza_vida_dias,
        // Tal cual vino del GET, null incluido: una hora del cliente nunca coincide
        // con la de la BD y el backend lo rechazaba con 412 (#231).
        fecha_actualizacion: especie.fecha_actualizacion,
      });
    } else {
      ok = await onRegistrar({ nombre: data.nombre.trim(), descripcion, grupo_manejo, densidad_poblacional_max, esperanza_vida_dias });
    }

    if (ok) onClose();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="especie-modal-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-modal__panel" style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="especie-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {titulo}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('especiesmodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && alertaGeneral && (
          <Alert
            variant="error"
            title={saveError.status === 412 ? t('especiesmodal.conflicto_de_edicion') : t('especiesmodal.error_al_guardar')}
            description={saveError.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <Input
              label={t('especiesmodal.nombre')}
              required
              aria-required="true"
              placeholder={t('especiesmodal.ej_bovino_avicola_porcino')}
              // M9-07: la regla se veía solo al fallar.
              hint={t('especiesmodal.regla_nombre')}
              error={errors.nombre?.message}
              {...register('nombre', {
                required: t('especiesmodal.el_nombre_es_obligatorio'),
                minLength: { value: 3, message: t('especiesmodal.minimo_3_caracteres') },
                maxLength: { value: 50, message: t('especiesmodal.maximo_50_caracteres') },
                pattern: { value: NOMBRE_REGEX, message: t('especiesmodal.solo_letras_y_espacios') },
              })}
            />

            <div>
              <label
                htmlFor="especie-desc"
                style={{ display: 'block', fontSize: 'var(--fs-body-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}
              >{t('especiesmodal.descripcion')}</label>
              <textarea
                id="especie-desc"
                aria-invalid={!!errors.descripcion}
                aria-describedby={errors.descripcion ? 'especie-desc-err' : undefined}
                style={TEXTAREA}
                placeholder={t('especiesmodal.descripcion_opcional_de_la_especie')}
                {...register('descripcion', {
                  maxLength: { value: 255, message: t('especiesmodal.maximo_255_caracteres') },
                })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s1)' }}>
                {errors.descripcion ? (
                  <p id="especie-desc-err" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>
                    {errors.descripcion.message}
                  </p>
                ) : (
                  <span />
                )}
                <span style={{ fontSize: '11px', color: (descValue?.length ?? 0) > 240 ? 'var(--sem-warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {descValue?.length ?? 0} / 255
                </span>
              </div>
            </div>

            <Select
              id="especie-grupo-manejo"
              label={t('especiesmodal.grupo_de_manejo')}
              required
              hint={t('especiesmodal.ayuda_grupo_de_manejo')}
              error={errors.grupo_manejo?.message}
              {...register('grupo_manejo', { required: t('especiesmodal.el_grupo_de_manejo_es_obligatorio') })}
            >
              <option value="" disabled>{t('especiesmodal.selecciona_grupo_de_manejo')}</option>
              {GRUPOS_MANEJO.map((g) => <option key={g} value={g}>{t(`especiesmodal.grupos_manejo.${g}`)}</option>)}
            </Select>

            <div className="ds-fg2">
              <Input
                label={t('especiesmodal.densidad')}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder={t('especiesmodal.densidad_placeholder')}
                hint={t('especiesmodal.densidad_ayuda')}
                error={errors.densidad_poblacional_max?.message}
                {...register('densidad_poblacional_max', {
                  validate: (v) => {
                    const valor = v.trim();
                    if (!valor) return true;
                    if (!DENSIDAD_REGEX.test(valor)) return t('especiesmodal.densidad_dos_decimales');
                    return Number(valor) > 0 || t('especiesmodal.densidad_mayor_a_cero');
                  },
                })}
              />
              <Input
                label={t('especiesmodal.esperanza_vida')}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                placeholder={t('especiesmodal.esperanza_vida_placeholder')}
                hint={t('especiesmodal.esperanza_vida_ayuda')}
                error={errors.esperanza_vida_dias?.message}
                {...register('esperanza_vida_dias', {
                  validate: (v) => {
                    const valor = v.trim();
                    if (!valor) return true;
                    return (/^\d+$/.test(valor) && Number(valor) > 0) || t('especiesmodal.esperanza_vida_entera');
                  },
                })}
              />
            </div>

            {modoEditar && especie && (
              <div style={{ padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Creado: {especie.fecha_creacion ? formatearFecha(especie.fecha_creacion) : '—'}
                {especie.fecha_actualizacion && (
                  <span> · Actualizado: {formatearFecha(especie.fecha_actualizacion)}</span>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('especiesmodal.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              {modoEditar ? 'Guardar cambios' : 'Registrar especie'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
