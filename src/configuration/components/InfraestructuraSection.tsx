import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw, Pencil, PowerOff, X, ChevronLeft, Warehouse } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useFincas } from '../hooks/useFincas';
import { useInfraestructuras } from '../hooks/useInfraestructuras';
import type { FincaResponse, InfraestructuraResponse, RegistrarInfraestructuraDTO, EditarInfraestructuraDTO } from '../types';
import type { ApiError } from '../../shared/api/errors';

// ── Constants ────────────────────────────────────────────────────────────────

const TIPOS_AREA = ['Galpón', 'Corral', 'Potrero', 'Estanque', 'Invernadero'] as const;
type TipoArea = typeof TIPOS_AREA[number];

const TIPO_EMOJI: Record<TipoArea, string> = {
  'Galpón': '🏚️',
  'Corral': '🐄',
  'Potrero': '🌿',
  'Estanque': '🐟',
  'Invernadero': '🌱',
};

// ── Styles ───────────────────────────────────────────────────────────────────

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

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ titulo, mensaje, confirmLabel, saving, error, onCancel, onConfirm }: {
  titulo: string; mensaje: string; confirmLabel: string;
  saving: boolean; error?: ApiError | null; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{titulo}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{mensaje}</p>
        {error && (
          <Alert variant="error" title="No se pudo completar la acción" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Infraestructura modal ─────────────────────────────────────────────────────

interface FormValues {
  tipo_area: TipoArea;
  nombre_infraestructura: string;
  superficie: number;
  descripcion_infraestructura: string;
}

interface InfraModalProps {
  infra: InfraestructuraResponse | null;
  finca: FincaResponse;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: RegistrarInfraestructuraDTO) => Promise<boolean>;
  onEditar: (id: number, dto: EditarInfraestructuraDTO) => Promise<boolean>;
}

function InfraModal({ infra, finca, saving, saveError, onClose, onRegistrar, onEditar }: InfraModalProps) {
  const modoEditar = infra !== null;
  const titulo = modoEditar ? `Editar área — ${infra.nombre_infraestructura}` : 'Registrar área productiva';

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({ mode: 'onBlur' });
  const desc = watch('descripcion_infraestructura', '');

  useEffect(() => {
    if (infra) {
      reset({
        tipo_area: infra.tipo_area as TipoArea,
        nombre_infraestructura: infra.nombre_infraestructura,
        superficie: infra.superficie,
        descripcion_infraestructura: infra.descripcion_infraestructura ?? '',
      });
    } else {
      reset({ tipo_area: 'Galpón', nombre_infraestructura: '', superficie: 0, descripcion_infraestructura: '' });
    }
  }, [infra, reset]);

  const onSubmit = async (data: FormValues) => {
    const payload = {
      tipo_area: data.tipo_area,
      nombre_infraestructura: data.nombre_infraestructura.trim(),
      superficie: Number(data.superficie),
      finca_id: finca.id_finca,
      descripcion_infraestructura: data.descripcion_infraestructura.trim() || undefined,
    };
    let ok: boolean;
    if (modoEditar && infra) {
      ok = await onEditar(infra.id_infraestructura, { ...payload, fecha_actualizacion: infra.fecha_actualizacion ?? undefined });
    } else {
      ok = await onRegistrar(payload);
    }
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="infra-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--s6) var(--s4)', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', marginBottom: 'var(--s6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)' }}>
          <h2 id="infra-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {titulo}
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
              description={saveError.status === 412
                ? 'Otro usuario modificó esta área. Recarga para ver los datos actuales antes de guardar.'
                : saveError.message}
              style={{ marginBottom: 'var(--s5)' }}
            />
          )}

          {/* Finca readonly */}
          <div style={{ padding: 'var(--s3) var(--s4)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s5)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Finca</span>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 'var(--s1)' }}>{finca.nombre}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {finca.ubicacion.departamento}, {finca.ubicacion.municipio}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Tipo de área */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
                Tipo de área <span aria-hidden="true" style={{ color: 'var(--sem-error)' }}>*</span>
              </label>
              <select
                aria-required="true"
                style={SELECT_STYLE}
                {...register('tipo_area', { required: 'Selecciona un tipo de área.' })}
              >
                {TIPOS_AREA.map((t) => (
                  <option key={t} value={t}>{TIPO_EMOJI[t]} {t}</option>
                ))}
              </select>
              {errors.tipo_area && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                  {errors.tipo_area.message}
                </p>
              )}
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Input
                label="Nombre del área"
                required
                aria-required="true"
                placeholder="Ej: Galpón norte, Estanque 1…"
                error={errors.nombre_infraestructura?.message}
                {...register('nombre_infraestructura', {
                  required: 'El nombre es obligatorio.',
                  minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                  maxLength: { value: 50, message: 'Máximo 50 caracteres.' },
                })}
              />
            </div>

            {/* Superficie */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Input
                label="Superficie (m²)"
                type="number"
                required
                aria-required="true"
                placeholder="Ej: 250.00"
                error={errors.superficie?.message}
                {...register('superficie', {
                  required: 'La superficie es obligatoria.',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Debe ser mayor a 0.' },
                })}
              />
            </div>

            {/* Descripción */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>
                Descripción <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={3}
                  placeholder="Descripción breve del área…"
                  style={{
                    width: '100%',
                    padding: 'var(--s3)',
                    borderRadius: 'var(--r-md)',
                    border: `1.5px solid ${errors.descripcion_infraestructura ? 'var(--sem-error)' : 'var(--surface-border)'}`,
                    background: 'var(--surface-card)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  {...register('descripcion_infraestructura', {
                    maxLength: { value: 100, message: 'Máximo 100 caracteres.' },
                  })}
                />
                <span style={{ position: 'absolute', bottom: 'var(--s2)', right: 'var(--s3)', fontSize: '11px', color: (desc?.length ?? 0) > 90 ? 'var(--sem-warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {desc?.length ?? 0}/100
                </span>
              </div>
              {errors.descripcion_infraestructura && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                  {errors.descripcion_infraestructura.message}
                </p>
              )}
            </div>

            {modoEditar && infra && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginBottom: 'var(--s5)', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Actualizado</div>
                  <div>{infra.fecha_actualizacion ? new Date(infra.fecha_actualizacion).toLocaleString('es-CO') : '—'}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" size="md" loading={saving}>
                {modoEditar ? 'Guardar cambios' : 'Registrar área'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Finca selector for infraestructuras ──────────────────────────────────────

interface FincaSelectorProps {
  fincas: FincaResponse[];
  loading: boolean;
  onSelect: (finca: FincaResponse) => void;
}

function FincaSelectorInfra({ fincas, loading, onSelect }: FincaSelectorProps) {
  const activas = fincas.filter((f) => f.es_activo);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 90, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (activas.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
        No hay fincas activas disponibles. Registra una finca primero.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--s4)' }}>
      {activas.map((f) => (
        <button
          key={f.id_finca}
          type="button"
          onClick={() => onSelect(f)}
          style={{
            background: 'var(--surface-card)',
            border: '1.5px solid var(--surface-border)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--s4)',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand-500)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--surface-border)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
            <Warehouse size={16} color="var(--brand-500)" aria-hidden />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.nombre}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {f.ubicacion.departamento}, {f.ubicacion.municipio}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            {f.tamano_h > 0 ? `${f.tamano_h} ha` : '—'}
          </div>
        </button>
      ))}
    </div>
  );
}

// ── InfraestructuraSection ───────────────────────────────────────────────────

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; infra: InfraestructuraResponse }
  | { tipo: 'desactivar'; infra: InfraestructuraResponse };

export function InfraestructuraSection() {
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(10, 1);
  const puedeEditar = usePermission(10, 3);
  const puedeDesact = usePermission(10, 4);

  const { fincas, loading: loadingFincas, cargar: cargarFincas } = useFincas();
  const { infraestructuras, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = useInfraestructuras();

  const [fincaSeleccionada, setFincaSeleccionada] = useState<FincaResponse | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });

  useEffect(() => { cargarFincas(); }, [cargarFincas]);

  useEffect(() => {
    if (fincaSeleccionada) cargar(fincaSeleccionada.id_finca);
  }, [fincaSeleccionada, cargar]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (infra: InfraestructuraResponse) => {
    const ok = await desactivar(infra.id_infraestructura);
    if (ok) cerrar();
  };

  const activas   = infraestructuras.filter((i) => i.es_activo).length;
  const inactivas = infraestructuras.length - activas;

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <Warehouse size={18} color="var(--brand-500)" aria-hidden />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Infraestructura Productiva
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
            Áreas productivas asociadas a cada finca
          </p>
        </div>
      </div>

      {!fincaSeleccionada ? (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>
            Selecciona una finca para gestionar sus áreas productivas:
          </p>
          <FincaSelectorInfra fincas={fincas} loading={loadingFincas} onSelect={setFincaSeleccionada} />
        </>
      ) : (
        <>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFincaSeleccionada(null); }}
                aria-label="Cambiar finca"
              >
                <ChevronLeft size={16} aria-hidden />
                Cambiar finca
              </Button>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>·</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{fincaSeleccionada.nombre}</span>
              {!loading && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activas} activas · {inactivas} inactivas
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--s2)' }}>
              <Button variant="ghost" size="sm" onClick={() => cargar(fincaSeleccionada.id_finca)} aria-label="Recargar áreas">
                <RefreshCw size={15} aria-hidden />
              </Button>
              {puedeCrear && (
                <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
                  <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
                  Nueva área
                </Button>
              )}
            </div>
          </div>

          {/* Alerts */}
          {!online && <Alert variant="warning" title="Sin conexión" description="Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s4)' }} />}
          {error && <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

          {/* Table */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))}
              <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
            </div>
          ) : infraestructuras.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--s7) 0', color: 'var(--text-muted)' }}>
              <Warehouse size={32} color="var(--text-muted)" style={{ marginBottom: 'var(--s3)' }} aria-hidden />
              <p style={{ fontSize: '14px' }}>No hay áreas registradas para esta finca.</p>
              {puedeCrear && online && (
                <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} style={{ marginTop: 'var(--s3)' }}>
                  <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
                  Registrar primera área
                </Button>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                      {['#', 'Tipo', 'Nombre', 'Superficie', 'Estado', 'Actualización', 'Acciones'].map((h) => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {infraestructuras.map((infra) => (
                      <tr key={infra.id_infraestructura} style={{ background: 'var(--surface-card)' }}>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                          #{infra.id_infraestructura}
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {TIPO_EMOJI[infra.tipo_area as TipoArea] ?? '🏗️'} {infra.tipo_area}
                          </span>
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{infra.nombre_infraestructura}</div>
                          {infra.descripcion_infraestructura && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {infra.descripcion_infraestructura}
                            </div>
                          )}
                        </td>
                        <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {infra.superficie.toLocaleString('es-CO')}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 4 }}>m²</span>
                        </td>
                        <td style={TD}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)',
                            padding: '2px var(--s2)', borderRadius: 'var(--r-full)',
                            fontSize: '11px', fontWeight: 600,
                            background: infra.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)',
                            color: infra.es_activo ? 'var(--sem-success)' : 'var(--text-muted)',
                            border: `1px solid ${infra.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: infra.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                            {infra.es_activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatFecha(infra.fecha_actualizacion)}
                        </td>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                            {puedeEditar && online && infra.es_activo && (
                              <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', infra })} aria-label={`Editar ${infra.nombre_infraestructura}`}>
                                <Pencil size={15} aria-hidden />
                              </Button>
                            )}
                            {puedeDesact && infra.es_activo && online && (
                              <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', infra })} aria-label={`Desactivar ${infra.nombre_infraestructura}`}>
                                <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modals */}
          {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
            <InfraModal
              infra={modal.tipo === 'editar' ? modal.infra : null}
              finca={fincaSeleccionada}
              saving={saving}
              saveError={saveError}
              onClose={cerrar}
              onRegistrar={registrar}
              onEditar={editar}
            />
          )}
          {modal.tipo === 'desactivar' && (
            <ConfirmModal
              titulo="Desactivar área"
              mensaje={`¿Deseas desactivar el área "${modal.infra.nombre_infraestructura}"? Los datos históricos permanecerán accesibles.`}
              confirmLabel="Desactivar"
              saving={saving}
              error={saveError}
              onCancel={cerrar}
              onConfirm={() => handleDesactivar(modal.infra)}
            />
          )}
        </>
      )}
    </div>
  );
}
