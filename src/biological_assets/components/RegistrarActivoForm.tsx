import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Boxes, User } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { ApiError } from '../../shared/api/errors';
import type { RegistrarActivoDTO, TipoActivo, OrigenFinanciero } from '../types';
import { hoyLocal } from '../../shared/lib/fecha';

interface FormValues {
  tipo_activo: TipoActivo;
  id_especie: string;
  fecha_inicio_ciclo: string;
  id_infraestructura: string;
  origen_financiero: OrigenFinanciero;
  costo_adquisicion: string;
  soporte_documental: string;
  detalles_procedencia: string;
  // individual
  identificador: string;
  raza: string;
  sexo: string;
  fecha_nacimiento: string;
  peso_inicial: string;
  // poblacional
  cantidad_inicial: string;
  peso_promedio_inicial: string;
}

interface Props {
  saving: boolean;
  saveError: ApiError | null;
  onSubmit: (dto: RegistrarActivoDTO) => Promise<boolean>;
  onCancel: () => void;
}

const SELECT: React.CSSProperties = {
  width: '100%',
  padding: 'var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  fontFamily: 'var(--font-sans)',
  height: 44,
  cursor: 'pointer',
};

const TEXTAREA: React.CSSProperties = {
  width: '100%',
  minHeight: 68,
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

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 'var(--s1)',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 var(--s3)',
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 'var(--s4)',
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
      {msg}
    </p>
  );
}

const HOY = hoyLocal();

export function RegistrarActivoForm({ saving, saveError, onSubmit, onCancel }: Props) {
  const { t } = useT('biologicalAssets');
  const {
    register, handleSubmit, watch, formState: { errors },
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      tipo_activo: 'INDIVIDUAL',
      origen_financiero: 'compra',
      sexo: '',
    },
  });

  const tipo = watch('tipo_activo');
  const origen = watch('origen_financiero');
  const esIndividual = tipo === 'INDIVIDUAL';
  const requiereSoporte = origen === 'compra' || origen === 'donacion';
  const esNacimiento = origen === 'nacimiento';

  const submit = async (v: FormValues) => {
    const dto: RegistrarActivoDTO = {
      tipo_activo: v.tipo_activo,
      id_especie: Number(v.id_especie),
      fecha_inicio_ciclo: v.fecha_inicio_ciclo,
      id_infraestructura: Number(v.id_infraestructura),
      origen_financiero: v.origen_financiero,
      detalles_procedencia: v.detalles_procedencia.trim() || null,
      costo_adquisicion: requiereSoporte && v.costo_adquisicion ? Number(v.costo_adquisicion) : null,
      soporte_documental: requiereSoporte ? (v.soporte_documental.trim() || null) : null,
    };

    if (esIndividual) {
      dto.identificador = v.identificador.trim();
      dto.raza = v.raza.trim();
      dto.sexo = v.sexo;
      dto.fecha_nacimiento = v.fecha_nacimiento ? new Date(v.fecha_nacimiento).toISOString() : null;
      dto.peso_inicial = v.peso_inicial ? Number(v.peso_inicial) : null;
    } else {
      dto.cantidad_inicial = Number(v.cantidad_inicial);
      dto.peso_promedio_inicial = v.peso_promedio_inicial ? Number(v.peso_promedio_inicial) : null;
    }

    await onSubmit(dto);
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate style={{ maxWidth: 760 }}>
      {saveError && (
        <Alert
          variant={saveError.status >= 500 ? 'error' : 'warning'}
          title={t('registraractivoform.no_se_pudo_registrar_el_activo')}
          description={saveError.message}
          style={{ marginBottom: 'var(--s5)' }}
        />
      )}

      {/* Tipo de activo */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.tipo_de_activo')}</span>
        <div style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap' }}>
          {(['INDIVIDUAL', 'POBLACIONAL'] as TipoActivo[]).map((tipo) => {
            const activo = tipo === tipo;
            return (
              <label
                key={tipo}
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--s3)',
                  padding: 'var(--s4)',
                  borderRadius: 'var(--r-lg)',
                  border: `1.5px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                  background: activo ? 'var(--brand-50)' : 'var(--surface-card)',
                  cursor: 'pointer',
                }}
              >
                <input type="radio" value={tipo} {...register('tipo_activo')} style={{ accentColor: 'var(--brand-500)' }} />
                {tipo === 'POBLACIONAL' ? <Boxes size={18} aria-hidden /> : <User size={18} aria-hidden />}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {tipo === 'POBLACIONAL' ? 'Poblacional (lote)' : 'Individual'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {tipo === 'POBLACIONAL' ? 'Grupo con cantidad' : 'Un ejemplar identificado'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Datos generales */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.datos_generales')}</span>
        <div style={GRID}>
          <Input
            label={t('registraractivoform.id_de_especie')} required type="number" min={1}
            placeholder="Ej: 1"
            hint="ID numérico de la especie del catálogo"
            error={errors.id_especie?.message}
            {...register('id_especie', {
              required: 'La especie es obligatoria.',
              min: { value: 1, message: 'ID inválido.' },
            })}
          />
          <Input
            label={t('registraractivoform.id_de_infraestructura')} required type="number" min={1}
            placeholder="Ej: 4"
            hint="ID de la infraestructura donde se ubica"
            error={errors.id_infraestructura?.message}
            {...register('id_infraestructura', {
              required: 'La infraestructura es obligatoria.',
              min: { value: 1, message: 'ID inválido.' },
            })}
          />
          <Input
            label={t('registraractivoform.fecha_de_inicio_de_ciclo')} required type="date" max={HOY}
            error={errors.fecha_inicio_ciclo?.message}
            {...register('fecha_inicio_ciclo', {
              required: 'La fecha de inicio es obligatoria.',
              validate: (val) => {
                if (val > HOY) return 'No puede ser una fecha futura.';
                if (val < '1970-01-01') return 'No puede ser anterior a 1970.';
                return true;
              },
            })}
          />
        </div>
      </div>

      {/* Origen financiero */}
      <div style={{ marginBottom: 'var(--s6)' }}>
        <span style={SECTION_TITLE}>{t('registraractivoform.origen_financiero')}</span>
        <div style={GRID}>
          <div>
            <label style={FIELD_LABEL} htmlFor="origen_financiero">{t('registraractivoform.origen')}<span aria-hidden="true">*</span></label>
            <select id="origen_financiero" style={SELECT} {...register('origen_financiero')}>
              <option value="compra">{t('registraractivoform.compra')}</option>
              <option value="nacimiento">{t('registraractivoform.nacimiento')}</option>
              <option value="donacion">{t('registraractivoform.donacion')}</option>
              <option value="transferencia_interna">{t('registraractivoform.transferencia_interna')}</option>
            </select>
          </div>

          {requiereSoporte && (
            <>
              <Input
                label={t('registraractivoform.costo_de_adquisicion')} required type="number" min={0} step="0.01"
                placeholder="Ej: 1500000"
                error={errors.costo_adquisicion?.message}
                {...register('costo_adquisicion', {
                  required: requiereSoporte ? 'El costo es obligatorio para compra/donación.' : false,
                  validate: (val) =>
                    !requiereSoporte || Number(val) > 0 || 'El costo debe ser mayor a 0.',
                })}
              />
              <Input
                label={t('registraractivoform.soporte_documental')} required
                placeholder={t('registraractivoform.ej_factura_n_o_00123')}
                error={errors.soporte_documental?.message}
                {...register('soporte_documental', {
                  required: requiereSoporte ? 'El soporte documental es obligatorio.' : false,
                })}
              />
            </>
          )}
        </div>
        {esNacimiento && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s2) 0 0' }}>{t('registraractivoform.en_nacimiento_no_se_registra_costo_ni')}</p>
        )}

        <div style={{ marginTop: 'var(--s4)' }}>
          <label style={FIELD_LABEL} htmlFor="detalles_procedencia">{t('registraractivoform.detalles_de_procedencia')}</label>
          <textarea
            id="detalles_procedencia" style={TEXTAREA}
            placeholder="Origen, proveedor, notas… (opcional)"
            {...register('detalles_procedencia')}
          />
        </div>
      </div>

      {/* Detalle según tipo */}
      {esIndividual ? (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <span style={SECTION_TITLE}>{t('registraractivoform.detalle_individual')}</span>
          <div style={GRID}>
            <Input
              label={t('registraractivoform.identificador')} required
              placeholder={t('registraractivoform.ej_bov_2024_001')}
              error={errors.identificador?.message}
              {...register('identificador', { required: 'El identificador es obligatorio para activos individuales.' })}
            />
            <Input
              label={t('registraractivoform.raza')} required
              placeholder={t('registraractivoform.ej_holstein')}
              error={errors.raza?.message}
              {...register('raza', { required: 'La raza es obligatoria.' })}
            />
            <div>
              <label style={FIELD_LABEL} htmlFor="sexo">{t('registraractivoform.sexo')}<span aria-hidden="true">*</span></label>
              <select id="sexo" style={SELECT} {...register('sexo', { required: 'El sexo es obligatorio.' })}>
                <option value="">{t('registraractivoform.seleccionar')}</option>
                <option value="MACHO">{t('registraractivoform.macho')}</option>
                <option value="HEMBRA">{t('registraractivoform.hembra')}</option>
              </select>
              <FieldError msg={errors.sexo?.message} />
            </div>
            <Input
              label={t('registraractivoform.fecha_de_nacimiento')} required type="date" max={HOY}
              error={errors.fecha_nacimiento?.message}
              {...register('fecha_nacimiento', {
                required: 'La fecha de nacimiento es obligatoria.',
                validate: (val) => val <= HOY || 'No puede ser una fecha futura.',
              })}
            />
            <Input
              label="Peso inicial (kg)" type="number" min={0} step="0.01"
              placeholder={t('registraractivoform.opcional')}
              {...register('peso_inicial')}
            />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <span style={SECTION_TITLE}>{t('registraractivoform.detalle_poblacional')}</span>
          <div style={GRID}>
            <Input
              label={t('registraractivoform.cantidad_inicial')} required type="number" min={1}
              placeholder="Ej: 1800"
              error={errors.cantidad_inicial?.message}
              {...register('cantidad_inicial', {
                required: 'La cantidad inicial es obligatoria para lotes.',
                min: { value: 1, message: 'Debe ser mayor a 0.' },
              })}
            />
            <Input
              label="Peso promedio inicial (kg)" type="number" min={0} step="0.001"
              placeholder={t('registraractivoform.opcional')}
              {...register('peso_promedio_inicial')}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('registraractivoform.cancelar')}</Button>
        <Button type="submit" variant="primary" size="md" loading={saving}>{t('registraractivoform.registrar_activo')}</Button>
      </div>
    </form>
  );
}
