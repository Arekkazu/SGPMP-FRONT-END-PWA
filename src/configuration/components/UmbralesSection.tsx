import React, { useEffect, useState } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw, Pencil, PowerOff, X, CircleCheck, TriangleAlert, OctagonAlert, Gauge, type LucideIcon } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useUmbralesAmbientales } from '../hooks/useUmbralesAmbientales';
import { useVariablesAmbientales } from '../hooks/useVariablesAmbientales';
import { validarUmbral } from '../lib/validarUmbral';
import type { UmbralAmbientalResponse, NivelAlertaDTO, VariableAmbientalCatalogo } from '../types';
import { useModalA11y } from '../../shared/hooks/useModalA11y';

interface Props {
  idEspecie: number;
}

// ── Variables ambientales: catálogo real via GET /configuracion/variables-ambientales ──
// (antes hardcodeado acá con IDs que no coincidían con `modulo9.variables_ambientales`
// en el backend — un umbral creado quedaba asociado a la variable equivocada).
interface VarAmbiental {
  id: number;
  nombre: string;
  unidad: string;
}

function getVar(variables: VariableAmbientalCatalogo[], id: number): VarAmbiental {
  const v = variables.find((x) => x.id_variable_ambiental === id);
  return v
    ? { id: v.id_variable_ambiental, nombre: v.nombre, unidad: v.unidad }
    : { id, nombre: `Variable #${id}`, unidad: '' };
}

// ── Niveles del semáforo ──────────────────────────────────────────────────────
// TC-DIS-44 (WCAG 1.4.1): cada nivel se distingue por icono y nombre, no solo
// por color. Los colores son tokens semánticos, sin opacity.
type Nivel = 'normal' | 'precaucion' | 'critico';

const NIVELES: Record<Nivel, { icono: LucideIcon; bg: string; border: string; color: string }> = {
  normal:     { icono: CircleCheck,   bg: 'var(--sem-success-bg)', border: 'var(--sem-success-border)', color: 'var(--sem-success)' },
  precaucion: { icono: TriangleAlert, bg: 'var(--sem-warning-bg)', border: 'var(--sem-warning-border)', color: 'var(--sem-warning)' },
  critico:    { icono: OctagonAlert,  bg: 'var(--sem-error-bg)',   border: 'var(--sem-error-border)',   color: 'var(--sem-error)' },
};

function rangoDe(niveles: NivelAlertaDTO[], nivel: Nivel): string {
  const n = niveles.find((x) => x.nivel === nivel);
  return n ? `${n.limite_inferior}–${n.limite_superior}` : '—';
}

// ── Modal state ───────────────────────────────────────────────────────────────
type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; umbral: UmbralAmbientalResponse }
  | { tipo: 'desactivar'; umbral: UmbralAmbientalResponse };

// ── Form values ───────────────────────────────────────────────────────────────
interface FormValues {
  id_variable_ambiental: number;
  valor_min: number;
  valor_max: number;
  normal_inf: number;
  normal_sup: number;
  precaucion_inf: number;
  precaucion_sup: number;
  critico_inf: number;
  critico_sup: number;
}

// ── Semáforo visual — barra proporcional horizontal ───────────────────────────
// Resumen grafico: los rangos con icono y texto estan en las columnas de cada
// nivel, y el lector de pantalla recibe el mismo resumen en el aria-label.
function SemaforoBar({ umbral }: { umbral: UmbralAmbientalResponse }) {
  const { t } = useT('configuration');
  const { valor_min, valor_max, niveles } = umbral;
  const rango = valor_max - valor_min;
  if (rango <= 0 || niveles.length === 0) return null;

  const pct = (v: number) => Math.min(100, Math.max(0, ((v - valor_min) / rango) * 100));
  // Se pinta de afuera hacia adentro: critico, precaucion y normal encima.
  const capas: Nivel[] = ['critico', 'precaucion', 'normal'];

  return (
    <div style={{ width: '100%', minWidth: 140 }}>
      <div
        role="img"
        aria-label={t('umbralessection.semaforo_resumen', {
          normal: rangoDe(niveles, 'normal'),
          precaucion: rangoDe(niveles, 'precaucion'),
          critico: rangoDe(niveles, 'critico'),
        })}
        style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-hover)', overflow: 'hidden' }}
      >
        {capas.map((nivel) => {
          const n = niveles.find((x) => x.nivel === nivel);
          if (!n) return null;
          const color = NIVELES[nivel].color;
          return (
            <div
              key={nivel}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${pct(n.limite_inferior)}%`, right: `${100 - pct(n.limite_superior)}%`,
                // Patron ademas del color: critico rayado, precaucion punteado, normal solido.
                background: nivel === 'critico'
                  ? `repeating-linear-gradient(45deg, ${color} 0 3px, var(--surface-card) 3px 5px)`
                  : nivel === 'precaucion'
                    ? `radial-gradient(circle, ${color} 1.5px, var(--sem-warning-bg) 1.6px) 0 0 / 4px 4px`
                    : color,
              }}
            />
          );
        })}
      </div>
      <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <span>{valor_min}</span>
        <span>{valor_max}</span>
      </div>
    </div>
  );
}

// ── Nivel card dentro del modal ───────────────────────────────────────────────
interface NivelCardProps {
  nivel: 'normal' | 'precaucion' | 'critico';
  unidad: string;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
}

function NivelCard({ nivel, unidad, register, errors }: NivelCardProps) {
  const { t } = useT('configuration');
  const cfg = NIVELES[nivel];
  const Icono = cfg.icono;
  const nombre = t(`umbralessection.nivel_${nivel}`);
  const infKey = `${nivel}_inf` as keyof FormValues;
  const supKey = `${nivel}_sup` as keyof FormValues;

  return (
    <div style={{ minWidth: 0, borderRadius: 'var(--r-lg)', padding: 'var(--s4)', border: `1.5px solid ${cfg.border}`, background: cfg.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
        <Icono size={16} strokeWidth={2} color={cfg.color} aria-hidden />
        <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{nombre}</span>
      </div>
      <p style={{ fontSize: '11px', color: cfg.color, marginBottom: 'var(--s3)', lineHeight: 1.4 }}>{t(`umbralessection.nivel_${nivel}_desc`)}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
        <div style={{ minWidth: 0 }}>
          <label htmlFor={`umbral-${nivel}-inf`} style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('umbralessection.limite_inferior')}<span className="ds-sr-only"> {nombre} ({unidad})</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              id={`umbral-${nivel}-inf`}
              aria-required="true"
              aria-invalid={!!errors[infKey]}
              aria-describedby={errors[infKey] ? `umbral-${nivel}-inf-err` : undefined}
              type="number"
              step="0.01"
              style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors[infKey] ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
              {...register(infKey, { required: 'Requerido.', valueAsNumber: true })}
            />
            <span aria-hidden="true" style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{unidad}</span>
          </div>
          {errors[infKey] && <p id={`umbral-${nivel}-inf-err`} role="alert" style={{ fontSize: '10px', color: 'var(--sem-error)', marginTop: 2 }}>{String(errors[infKey]?.message)}</p>}
        </div>
        <div style={{ minWidth: 0 }}>
          <label htmlFor={`umbral-${nivel}-sup`} style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('umbralessection.limite_superior')}<span className="ds-sr-only"> {nombre} ({unidad})</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              id={`umbral-${nivel}-sup`}
              aria-required="true"
              aria-invalid={!!errors[supKey]}
              aria-describedby={errors[supKey] ? `umbral-${nivel}-sup-err` : undefined}
              type="number"
              step="0.01"
              style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors[supKey] ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
              {...register(supKey, { required: 'Requerido.', valueAsNumber: true })}
            />
            <span aria-hidden="true" style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{unidad}</span>
          </div>
          {errors[supKey] && <p id={`umbral-${nivel}-sup-err`} role="alert" style={{ fontSize: '10px', color: 'var(--sem-error)', marginTop: 2 }}>{String(errors[supKey]?.message)}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Modal crear / editar ──────────────────────────────────────────────────────
function UmbralModal({
  umbral,
  idEspecie,
  variables,
  umbralesExistentes,
  saving,
  saveError,
  onClose,
  onRegistrar,
  onEditar,
}: {
  umbral: UmbralAmbientalResponse | null;
  idEspecie: number;
  variables: VariableAmbientalCatalogo[];
  umbralesExistentes: UmbralAmbientalResponse[];
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: import('../types').RegistrarUmbralDTO) => Promise<boolean>;
  onEditar: (id: number, dto: import('../types').EditarUmbralDTO) => Promise<boolean>;
}) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const modoEditar = umbral !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const varSelId = watch('id_variable_ambiental');
  const varSel = getVar(variables, Number(varSelId));

  // FA-02 (RF-17): aviso proactivo antes de intentar enviar — el backend sigue
  // siendo la autoridad final (409 UMBRAL_DUPLICADO) si de todos modos hay carrera.
  const duplicadoSeleccionado =
    !modoEditar &&
    umbralesExistentes.some((u) => u.es_activo && u.id_variable_ambiental === Number(varSelId));

  useEffect(() => {
    if (umbral) {
      const n = (nivel: string) => umbral.niveles.find((v) => v.nivel === nivel);
      reset({
        id_variable_ambiental: umbral.id_variable_ambiental,
        valor_min: umbral.valor_min,
        valor_max: umbral.valor_max,
        normal_inf: n('normal')?.limite_inferior ?? 0,
        normal_sup: n('normal')?.limite_superior ?? 0,
        precaucion_inf: n('precaucion')?.limite_inferior ?? 0,
        precaucion_sup: n('precaucion')?.limite_superior ?? 0,
        critico_inf: n('critico')?.limite_inferior ?? 0,
        critico_sup: n('critico')?.limite_superior ?? 0,
      });
    } else {
      reset({
        id_variable_ambiental: variables[0]?.id_variable_ambiental ?? 0,
        valor_min: 0,
        valor_max: 100,
        normal_inf: 0,
        normal_sup: 0,
        precaucion_inf: 0,
        precaucion_sup: 0,
        critico_inf: 0,
        critico_sup: 0,
      });
    }
  }, [umbral, reset, variables]);

  const buildNiveles = (data: FormValues): NivelAlertaDTO[] => [
    { nivel: 'normal',    limite_inferior: Number(data.normal_inf),    limite_superior: Number(data.normal_sup) },
    { nivel: 'precaucion',limite_inferior: Number(data.precaucion_inf),limite_superior: Number(data.precaucion_sup) },
    { nivel: 'critico',   limite_inferior: Number(data.critico_inf),   limite_superior: Number(data.critico_sup) },
  ];

  const onSubmit = async (data: FormValues) => {
    const niveles = buildNiveles(data);

    const error = validarUmbral({
      valorMin: Number(data.valor_min),
      valorMax: Number(data.valor_max),
      niveles,
      variable: variables.find((v) => v.id_variable_ambiental === Number(data.id_variable_ambiental)),
      idVariableAmbiental: Number(data.id_variable_ambiental),
      umbralesExistentes: modoEditar ? [] : umbralesExistentes,
    });
    if (error) {
      setErrorValidacion(error.mensaje);
      return;
    }
    setErrorValidacion(null);

    let ok: boolean;
    if (modoEditar && umbral) {
      ok = await onEditar(umbral.id_umbral_ambiental, {
        valor_min: Number(data.valor_min),
        valor_max: Number(data.valor_max),
        niveles,
        fecha_actualizacion: umbral.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({
        id_especie: idEspecie,
        id_variable_ambiental: Number(data.id_variable_ambiental),
        valor_min: Number(data.valor_min),
        valor_max: Number(data.valor_max),
        niveles,
      });
    }
    if (ok) onClose();
  };

  const SELECT_STYLE: React.CSSProperties = {
    width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)',
    border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)',
    color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none',
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="umbral-modal-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ds-modal__panel ds-modal__panel--wide">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 id="umbral-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {modoEditar ? `Editar umbral — ${getVar(variables, umbral!.id_variable_ambiental).nombre}` : 'Nuevo umbral ambiental'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('umbralessection.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && (
            <Alert
              variant="error"
              title={saveError.status === 412 ? t('umbralessection.conflicto_de_edicion') : t('umbralessection.error_al_guardar')}
              description={saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}
          {errorValidacion && (
            <Alert
              variant="error"
              title={t('umbralessection.error_de_validacion')}
              description={errorValidacion}
              onDismiss={() => setErrorValidacion(null)}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>

              {/* Variable ambiental — solo en crear */}
              {!modoEditar && (
                <div>
                  <label htmlFor="var-ambiental" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>{t('umbralessection.variable_ambiental')}<span style={{ color: 'var(--sem-error)' }}>*</span>
                  </label>
                  <select id="var-ambiental" style={SELECT_STYLE} {...register('id_variable_ambiental', { required: true, valueAsNumber: true })}>
                    {variables.map((v) => (
                      <option key={v.id_variable_ambiental} value={v.id_variable_ambiental}>
                        {v.nombre} ({v.unidad})
                      </option>
                    ))}
                  </select>
                  {duplicadoSeleccionado && (
                    <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                      {t('umbralessection.ya_existe_un_umbral_activo_para')}
                    </p>
                  )}
                </div>
              )}

              {/* Unidad de referencia */}
              {modoEditar && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)' }}>
                  <Gauge size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{getVar(variables, umbral!.id_variable_ambiental).nombre}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({getVar(variables, umbral!.id_variable_ambiental).unidad})</span>
                </div>
              )}

              {/* ── SECCIÓN 1: Rango general ── */}
              <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-hover)', padding: 'var(--s2) var(--s4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('umbralessection.1_rango_ambiental_aceptable')}</span>
                  <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 600 }}>{t('umbralessection.requerido')}</span>
                </div>
                <div style={{ padding: 'var(--s5)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('umbralessection.define_el_rango_de_valores_aceptables_el')}</p>
                  <div className="ds-fg2" style={{ gap: 'var(--s4)', maxWidth: 380 }}>
                    <Input
                      label={`Valor mínimo (${varSel.unidad})`}
                      type="number"
                      required
                      aria-required="true"
                      placeholder="Ej: 18.00"
                      error={errors.valor_min?.message}
                      {...register('valor_min', {
                        required: 'Requerido.',
                        valueAsNumber: true,
                        validate: (v, all) => Number(v) < Number(all.valor_max) || 'Debe ser menor al máximo.',
                      })}
                    />
                    <Input
                      label={`Valor máximo (${varSel.unidad})`}
                      type="number"
                      required
                      aria-required="true"
                      placeholder="Ej: 35.00"
                      error={errors.valor_max?.message}
                      {...register('valor_max', {
                        required: 'Requerido.',
                        valueAsNumber: true,
                        validate: (v, all) => Number(v) > Number(all.valor_min) || 'Debe ser mayor al mínimo.',
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* ── SECCIÓN 2: Niveles de alerta ── */}
              <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-hover)', padding: 'var(--s2) var(--s4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('umbralessection.2_niveles_de_alerta_semaforizacion')}</span>
                  <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 600 }}>{t('umbralessection.requerido')}</span>
                </div>
                <div style={{ padding: 'var(--s5)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('umbralessection.define_tres_zonas_de_alerta_dentro_del')}</p>
                  {/* INC-M09 (visual): `repeat(3, minmax(0,1fr))` apretaba las tres tarjetas
                      del semáforo a ~170px en un modal de 560px y, dentro de cada una, los dos
                      inputs quedaban diminutos e inservibles. `auto-fit` con pista mínima de
                      200px mantiene las tres columnas en escritorio y las apila a una sola en
                      pantallas estrechas, sin el bug de `auto-fill` de #55 (que dejaba pistas
                      vacías y desbordaba al filo de 512-560px). */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s3)' }}>
                    <NivelCard nivel="normal"     unidad={varSel.unidad} register={register} errors={errors} />
                    <NivelCard nivel="precaucion" unidad={varSel.unidad} register={register} errors={errors} />
                    <NivelCard nivel="critico"    unidad={varSel.unidad} register={register} errors={errors} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('umbralessection.cancelar')}</Button>
              <Button type="submit" variant="primary" size="md" loading={saving} disabled={duplicadoSeleccionado}>
                {modoEditar ? 'Guardar cambios' : 'Registrar umbral'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Confirm desactivar ────────────────────────────────────────────────────────
function ConfirmDesactivar({ umbral, variables, saving, onCancel, onConfirm }: { umbral: UmbralAmbientalResponse; variables: VariableAmbientalCatalogo[]; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useModalA11y(onCancel);
  const { t } = useT('configuration');
  const v = getVar(variables, umbral.id_variable_ambiental);
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="umbral-desactivar-title"
      className="ds-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)' }}>
        <h2 id="umbral-desactivar-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('umbralessection.confirmar_desactivacion')}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{t('umbralessection.deseas_desactivar_el_umbral_de')}{' '}<strong>{v.nombre}</strong>{t('umbralessection.ya_no_estara_vigente_para_las_alertas')}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('umbralessection.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('umbralessection.desactivar')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tabla TH / TD ─────────────────────────────────────────────────────────────
const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
};

function NivelBadge({ nivel, niveles }: { nivel: Nivel; niveles: NivelAlertaDTO[] }) {
  const n = niveles.find((x) => x.nivel === nivel);
  if (!n) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;

  const c = NIVELES[nivel];
  const Icono = c.icono;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 'var(--r-full)', fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', background: c.bg, border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap' }}>
      <Icono size={12} strokeWidth={2} aria-hidden />
      {n.limite_inferior}–{n.limite_superior}
    </span>
  );
}

function NivelHeader({ nivel }: { nivel: Nivel }) {
  const { t } = useT('configuration');
  const Icono = NIVELES[nivel].icono;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icono size={12} strokeWidth={2} color={NIVELES[nivel].color} aria-hidden />
      {t(`umbralessection.nivel_${nivel}`)}
    </span>
  );
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try { return formatearFecha(iso, { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso; }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function UmbralesSection({ idEspecie }: Props) {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(20, 1);
  const puedeEditar = usePermission(20, 3);
  const puedeDesact = usePermission(20, 4);

  const { umbrales, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = useUmbralesAmbientales();
  const { variables, cargar: cargarVariables } = useVariablesAmbientales();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(idEspecie); }, [cargar, idEspecie]);
  useEffect(() => { cargarVariables(); }, [cargarVariables]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (u: UmbralAmbientalResponse) => {
    setAccionError(null);
    const ok = await desactivar(u.id_umbral_ambiental);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const activos = umbrales.filter((u) => u.es_activo).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('umbralessection.umbrales_ambientales')}</h3>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activos} activos · {umbrales.length - activos} inactivos
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(idEspecie)} aria-label={t('umbralessection.recargar_umbrales')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('umbralessection.nuevo_umbral')}</Button>
          )}
        </div>
      </div>

      {!online && <Alert variant="warning" title={t('umbralessection.sin_conexion')} description={t('umbralessection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s4)' }} />}
      {error && <Alert variant="error" title={t('umbralessection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {accionError && <Alert variant="error" title={t('umbralessection.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : umbrales.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>{t('umbralessection.no_hay_umbrales_configurados_para_esta')}</p>
      ) : (
        <ScrollRegion label={t('umbralessection.umbrales_ambientales')}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['#', 'Variable', 'Rango general', 'Semaforización'].map((h) => <th key={h} style={TH}>{h}</th>)}
                {(['normal', 'precaucion', 'critico'] as const).map((n) => <th key={n} style={TH}><NivelHeader nivel={n} /></th>)}
                {['Estado', 'Actualizado', 'Acciones'].map((h) => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {umbrales.map((u) => {
                const v = getVar(variables, u.id_variable_ambiental);
                return (
                  <tr key={u.id_umbral_ambiental} style={{ background: 'var(--surface-card)' }}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{u.id_umbral_ambiental}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <Gauge size={16} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{v.nombre}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{v.unidad}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {u.valor_min} – {u.valor_max} <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{v.unidad}</span>
                    </td>
                    <td style={{ ...TD, minWidth: 160 }}>
                      <SemaforoBar umbral={u} />
                    </td>
                    <td style={TD}><NivelBadge nivel="normal"     niveles={u.niveles} /></td>
                    <td style={TD}><NivelBadge nivel="precaucion" niveles={u.niveles} /></td>
                    <td style={TD}><NivelBadge nivel="critico"    niveles={u.niveles} /></td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: u.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)', color: u.es_activo ? 'var(--sem-success)' : 'var(--text-muted)', border: `1px solid ${u.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                        {u.es_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatFecha(u.fecha_actualizacion)}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                        {puedeEditar && (
                          <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', umbral: u })} aria-label={`Editar umbral ${v.nombre}`}>
                            <Pencil size={15} aria-hidden />
                          </Button>
                        )}
                        {puedeDesact && u.es_activo && online && (
                          <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', umbral: u })} aria-label={`Desactivar umbral ${v.nombre}`}>
                            <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <UmbralModal
          umbral={modal.tipo === 'editar' ? modal.umbral : null}
          idEspecie={idEspecie}
          variables={variables}
          umbralesExistentes={umbrales}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onRegistrar={registrar}
          onEditar={editar}
        />
      )}
      {modal.tipo === 'desactivar' && (
        <ConfirmDesactivar
          umbral={modal.umbral}
          variables={variables}
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.umbral)}
        />
      )}
    </div>
  );
}
