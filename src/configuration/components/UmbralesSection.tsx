import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw, Pencil, PowerOff, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useUmbralesAmbientales } from '../hooks/useUmbralesAmbientales';
import type { UmbralAmbientalResponse, NivelAlertaDTO } from '../types';

interface Props {
  idEspecie: number;
}

// ── Variables ambientales catálogo (hardcoded, no hay endpoint de listado) ────
interface VarAmbiental {
  id: number;
  nombre: string;
  unidad: string;
  emoji: string;
}

const VARIABLES_AMBIENTALES: VarAmbiental[] = [
  { id: 1, nombre: 'Temperatura', unidad: '°C', emoji: '🌡️' },
  { id: 2, nombre: 'Humedad Relativa', unidad: '%', emoji: '💧' },
  { id: 3, nombre: 'pH del Agua', unidad: 'pH', emoji: '⚗️' },
  { id: 4, nombre: 'Oxígeno Disuelto', unidad: 'mg/L', emoji: '💨' },
  { id: 5, nombre: 'Amoníaco', unidad: 'ppm', emoji: '☁️' },
  { id: 6, nombre: 'Salinidad', unidad: 'ppt', emoji: '🧂' },
  { id: 7, nombre: 'Luminosidad', unidad: 'lux', emoji: '☀️' },
];

function getVar(id: number): VarAmbiental {
  return VARIABLES_AMBIENTALES.find((v) => v.id === id) ?? { id, nombre: `Variable #${id}`, unidad: '', emoji: '📊' };
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
function SemaforoBar({ umbral }: { umbral: UmbralAmbientalResponse }) {
  const { valor_min, valor_max, niveles } = umbral;
  const rango = valor_max - valor_min;
  if (rango <= 0 || niveles.length === 0) return null;

  const pct = (v: number) => Math.min(100, Math.max(0, ((v - valor_min) / rango) * 100));

  const normalNivel = niveles.find((n) => n.nivel === 'normal');
  const precNivel = niveles.find((n) => n.nivel === 'precaucion');
  const critNivel = niveles.find((n) => n.nivel === 'critico');

  return (
    <div style={{ width: '100%', minWidth: 140 }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-hover)', overflow: 'hidden' }}>
        {critNivel && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(critNivel.limite_inferior)}%`, right: `${100 - pct(critNivel.limite_superior)}%`, background: '#c0280a', opacity: 0.8 }} />
        )}
        {precNivel && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(precNivel.limite_inferior)}%`, right: `${100 - pct(precNivel.limite_superior)}%`, background: '#c07a00', opacity: 0.8 }} />
        )}
        {normalNivel && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(normalNivel.limite_inferior)}%`, right: `${100 - pct(normalNivel.limite_superior)}%`, background: '#1a7a2e', opacity: 0.9 }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
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

const NIVEL_COLORS = {
  normal:    { bg: 'var(--sem-success-bg)',  border: 'var(--sem-success-border)', color: '#1a7a2e', label: '🟢 NORMAL',    desc: 'Condiciones óptimas de operación.' },
  precaucion:{ bg: 'var(--sem-warning-bg,#fff8e6)', border: '#e8c840',            color: '#b06000', label: '🟡 PRECAUCIÓN', desc: 'Condiciones límite, cercanas al borde aceptable.' },
  critico:   { bg: 'var(--sem-error-bg)',    border: 'var(--sem-error-border)',   color: '#b01808', label: '🔴 CRÍTICO',   desc: 'Condiciones de riesgo en los extremos del rango.' },
};

function NivelCard({ nivel, unidad, register, errors }: NivelCardProps) {
  const cfg = NIVEL_COLORS[nivel];
  const infKey = `${nivel}_inf` as keyof FormValues;
  const supKey = `${nivel}_sup` as keyof FormValues;

  return (
    <div style={{ borderRadius: 'var(--r-lg)', padding: 'var(--s4)', border: `1.5px solid ${cfg.border}`, background: cfg.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
      </div>
      <p style={{ fontSize: '11px', color: cfg.color, marginBottom: 'var(--s3)', lineHeight: 1.4 }}>{cfg.desc}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s2)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Límite inferior</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              step="0.01"
              style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors[infKey] ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
              {...register(infKey, { required: 'Requerido.', valueAsNumber: true })}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{unidad}</span>
          </div>
          {errors[infKey] && <p role="alert" style={{ fontSize: '10px', color: 'var(--sem-error)', marginTop: 2 }}>{String(errors[infKey]?.message)}</p>}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Límite superior</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              step="0.01"
              style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 'var(--r-md)', border: `1.5px solid ${errors[supKey] ? 'var(--sem-error)' : 'var(--surface-border)'}`, background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none' }}
              {...register(supKey, { required: 'Requerido.', valueAsNumber: true })}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{unidad}</span>
          </div>
          {errors[supKey] && <p role="alert" style={{ fontSize: '10px', color: 'var(--sem-error)', marginTop: 2 }}>{String(errors[supKey]?.message)}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Modal crear / editar ──────────────────────────────────────────────────────
function UmbralModal({
  umbral,
  idEspecie,
  saving,
  saveError,
  onClose,
  onRegistrar,
  onEditar,
}: {
  umbral: UmbralAmbientalResponse | null;
  idEspecie: number;
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: import('../types').RegistrarUmbralDTO) => Promise<boolean>;
  onEditar: (id: number, dto: import('../types').EditarUmbralDTO) => Promise<boolean>;
}) {
  const modoEditar = umbral !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  const varSelId = watch('id_variable_ambiental');
  const varSel = getVar(Number(varSelId));

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
        id_variable_ambiental: VARIABLES_AMBIENTALES[0].id,
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
  }, [umbral, reset]);

  const buildNiveles = (data: FormValues): NivelAlertaDTO[] => [
    { nivel: 'normal',    limite_inferior: Number(data.normal_inf),    limite_superior: Number(data.normal_sup) },
    { nivel: 'precaucion',limite_inferior: Number(data.precaucion_inf),limite_superior: Number(data.precaucion_sup) },
    { nivel: 'critico',   limite_inferior: Number(data.critico_inf),   limite_superior: Number(data.critico_sup) },
  ];

  const onSubmit = async (data: FormValues) => {
    const niveles = buildNiveles(data);
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="umbral-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--s6) var(--s4)', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', marginBottom: 'var(--s6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 id="umbral-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {modoEditar ? `Editar umbral — ${getVar(umbral!.id_variable_ambiental).nombre}` : 'Nuevo umbral ambiental'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden />
          </Button>
        </div>

        <div style={{ padding: 'var(--s6)' }}>
          {saveError && (
            <Alert
              variant="error"
              title={saveError.status === 412 ? 'Conflicto de edición' : 'Error al guardar'}
              description={saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>

              {/* Variable ambiental — solo en crear */}
              {!modoEditar && (
                <div>
                  <label htmlFor="var-ambiental" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>
                    Variable ambiental <span style={{ color: 'var(--sem-error)' }}>*</span>
                  </label>
                  <select id="var-ambiental" style={SELECT_STYLE} {...register('id_variable_ambiental', { required: true, valueAsNumber: true })}>
                    {VARIABLES_AMBIENTALES.map((v) => (
                      <option key={v.id} value={v.id}>{v.emoji} {v.nombre} ({v.unidad})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Unidad de referencia */}
              {modoEditar && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)' }}>
                  <span style={{ fontSize: '18px' }}>{getVar(umbral!.id_variable_ambiental).emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{getVar(umbral!.id_variable_ambiental).nombre}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({getVar(umbral!.id_variable_ambiental).unidad})</span>
                </div>
              )}

              {/* ── SECCIÓN 1: Rango general ── */}
              <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-hover)', padding: 'var(--s2) var(--s4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>1 · RANGO AMBIENTAL ACEPTABLE</span>
                  <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 600 }}>Requerido</span>
                </div>
                <div style={{ padding: 'var(--s5)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                    Define el rango de valores aceptables. El valor mínimo debe ser estrictamente menor al máximo.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', maxWidth: 380 }}>
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
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>2 · NIVELES DE ALERTA — SEMAFORIZACIÓN</span>
                  <span style={{ fontSize: '10px', color: 'var(--brand-600)', fontWeight: 600 }}>Requerido</span>
                </div>
                <div style={{ padding: 'var(--s5)' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
                    Define tres zonas de alerta dentro del rango general.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--s3)' }}>
                    <NivelCard nivel="normal"     unidad={varSel.unidad} register={register} errors={errors} />
                    <NivelCard nivel="precaucion" unidad={varSel.unidad} register={register} errors={errors} />
                    <NivelCard nivel="critico"    unidad={varSel.unidad} register={register} errors={errors} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>
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
function ConfirmDesactivar({ umbral, saving, onCancel, onConfirm }: { umbral: UmbralAmbientalResponse; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const v = getVar(umbral.id_variable_ambiental);
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>Confirmar desactivación</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>
          ¿Deseas desactivar el umbral de <strong>{v.nombre}</strong>? Ya no estará vigente para las alertas.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>Desactivar</Button>
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

function NivelBadge({ nivel, niveles }: { nivel: string; niveles: NivelAlertaDTO[] }) {
  const n = niveles.find((x) => x.nivel === nivel);
  if (!n) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;

  const colors: Record<string, { bg: string; border: string; color: string }> = {
    normal:    { bg: '#e8f5eb', border: '#a8d8b0', color: '#1a7a2e' },
    precaucion:{ bg: '#fff3d0', border: '#e8c840', color: '#b06000' },
    critico:   { bg: '#ffeaea', border: '#f0a8a8', color: '#b01808' },
  };
  const c = colors[nivel];
  return (
    <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: 'var(--r-full)', fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)', background: c.bg, border: `1px solid ${c.border}`, color: c.color, whiteSpace: 'nowrap' }}>
      {n.limite_inferior}–{n.limite_superior}
    </span>
  );
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso; }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function UmbralesSection({ idEspecie }: Props) {
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(20, 1);
  const puedeEditar = usePermission(20, 3);
  const puedeDesact = usePermission(20, 4);

  const { umbrales, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = useUmbralesAmbientales();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(idEspecie); }, [cargar, idEspecie]);

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
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Umbrales Ambientales</h3>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activos} activos · {umbrales.length - activos} inactivos
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(idEspecie)} aria-label="Recargar umbrales">
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Nuevo umbral
            </Button>
          )}
        </div>
      </div>

      {!online && <Alert variant="warning" title="Sin conexión" description="Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s4)' }} />}
      {error && <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {accionError && <Alert variant="error" title="Error" description={accionError} style={{ marginBottom: 'var(--s4)' }} />}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : umbrales.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
          No hay umbrales configurados para esta especie.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['#', 'Variable', 'Rango general', 'Semaforización', '🟢 Normal', '🟡 Precaución', '🔴 Crítico', 'Estado', 'Actualizado', 'Acciones'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {umbrales.map((u) => {
                const v = getVar(u.id_variable_ambiental);
                return (
                  <tr key={u.id_umbral_ambiental} style={{ background: 'var(--surface-card)' }}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{u.id_umbral_ambiental}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                        <span style={{ fontSize: '16px' }}>{v.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{v.nombre}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{v.unidad}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>
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
        </div>
      )}

      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <UmbralModal
          umbral={modal.tipo === 'editar' ? modal.umbral : null}
          idEspecie={idEspecie}
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
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.umbral)}
        />
      )}
    </div>
  );
}
