import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw, Pencil, PowerOff, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useCiclosBiologicos } from '../hooks/useCiclosBiologicos';
import type { CicloBiologicoResponse } from '../types';

interface Props {
  idEspecie: number;
}

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; ciclo: CicloBiologicoResponse }
  | { tipo: 'desactivar'; ciclo: CicloBiologicoResponse };

interface FormValues {
  nombre: string;
  descripcion: string;
  duracion_dias: number;
}

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

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function CicloModal({
  ciclo,
  idEspecie,
  saving,
  saveError,
  onClose,
  onRegistrar,
  onEditar,
}: {
  ciclo: CicloBiologicoResponse | null;
  idEspecie: number;
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: import('../types').RegistrarCicloDTO) => Promise<boolean>;
  onEditar: (id: number, dto: import('../types').EditarCicloDTO) => Promise<boolean>;
}) {
  const modoEditar = ciclo !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    if (ciclo) {
      reset({ nombre: ciclo.nombre, descripcion: ciclo.descripcion ?? '', duracion_dias: ciclo.duracion_dias });
    } else {
      reset({ nombre: '', descripcion: '', duracion_dias: 1 });
    }
  }, [ciclo, reset]);

  const onSubmit = async (data: FormValues) => {
    const descripcion = data.descripcion.trim() || undefined;
    const duracion_dias = Number(data.duracion_dias);
    let ok: boolean;
    if (modoEditar && ciclo) {
      ok = await onEditar(ciclo.id_ciclo_biologico, {
        id_especie: idEspecie,
        nombre: data.nombre.trim(),
        descripcion,
        duracion_dias,
        fecha_actualizacion: ciclo.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({ id_especie: idEspecie, nombre: data.nombre.trim(), descripcion, duracion_dias });
    }
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ciclo-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="ciclo-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {modoEditar ? `Editar ciclo — ${ciclo!.nombre}` : 'Nuevo ciclo biológico'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && (
          <Alert
            variant="error"
            title={saveError.status === 412 ? 'Conflicto de edición' : 'Error al guardar'}
            description={saveError.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <Input
              label="Nombre"
              required
              aria-required="true"
              placeholder="Ej: Ciclo de crecimiento, Fase de engorde…"
              error={errors.nombre?.message}
              {...register('nombre', {
                required: 'El nombre es obligatorio.',
                minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres.' },
              })}
            />
            <Input
              label="Duración (días)"
              type="number"
              required
              aria-required="true"
              placeholder="Ej: 90"
              error={errors.duracion_dias?.message}
              {...register('duracion_dias', {
                required: 'La duración es obligatoria.',
                min: { value: 1, message: 'Mínimo 1 día.' },
                max: { value: 9999, message: 'Máximo 9999 días.' },
                validate: (v) => Number.isInteger(Number(v)) || 'Debe ser un número entero.',
              })}
            />
            <div>
              <label htmlFor="ciclo-desc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>
                Descripción
              </label>
              <textarea
                id="ciclo-desc"
                style={{ width: '100%', minHeight: 72, padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none' }}
                placeholder="Descripción opcional…"
                {...register('descripcion', { maxLength: { value: 255, message: 'Máximo 255 caracteres.' } })}
              />
              {errors.descripcion && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                  {errors.descripcion.message}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              {modoEditar ? 'Guardar cambios' : 'Registrar ciclo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDesactivar({ ciclo, saving, onCancel, onConfirm }: { ciclo: CicloBiologicoResponse; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
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
          ¿Deseas desactivar el ciclo "{ciclo.nombre}"? Los datos históricos permanecerán accesibles.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>Desactivar</Button>
        </div>
      </div>
    </div>
  );
}

export function CiclosSection({ idEspecie }: Props) {
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(17, 1);
  const puedeEditar = usePermission(17, 3);
  const puedeDesact = usePermission(17, 4);

  const { ciclos, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = useCiclosBiologicos();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(idEspecie); }, [cargar, idEspecie]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (ciclo: CicloBiologicoResponse) => {
    setAccionError(null);
    const ok = await desactivar(ciclo.id_ciclo_biologico);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const activos = ciclos.filter((c) => c.es_activo).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Ciclos Biológicos</h3>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activos} activos · {ciclos.length - activos} inactivos
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(idEspecie)} aria-label="Recargar ciclos">
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Nuevo ciclo
            </Button>
          )}
        </div>
      </div>

      {!online && (
        <Alert variant="warning" title="Sin conexión" description="Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {accionError && (
        <Alert variant="error" title="Error" description={accionError} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : ciclos.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
          No hay ciclos registrados para esta especie.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['#', 'Nombre', 'Descripción', 'Duración', 'Estado', 'Actualizado', 'Acciones'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ciclos.map((c) => (
                <tr key={c.id_ciclo_biologico} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{c.id_ciclo_biologico}</td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{c.nombre}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px', maxWidth: 220 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.descripcion ?? undefined}>
                      {c.descripcion ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}
                    </span>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {c.duracion_dias} días
                  </td>
                  <td style={TD}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: c.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)', color: c.es_activo ? 'var(--sem-success)' : 'var(--text-muted)', border: `1px solid ${c.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                      {c.es_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatFecha(c.fecha_actualizacion)}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', ciclo: c })} aria-label={`Editar ${c.nombre}`}>
                          <Pencil size={15} aria-hidden />
                        </Button>
                      )}
                      {puedeDesact && c.es_activo && online && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', ciclo: c })} aria-label={`Desactivar ${c.nombre}`}>
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
      )}

      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <CicloModal
          ciclo={modal.tipo === 'editar' ? modal.ciclo : null}
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
          ciclo={modal.ciclo}
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.ciclo)}
        />
      )}
    </div>
  );
}
