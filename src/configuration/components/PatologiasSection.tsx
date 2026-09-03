import React, { useEffect, useState } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { useForm } from 'react-hook-form';
import { Plus, RefreshCw, Pencil, PowerOff, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { usePatologias } from '../hooks/usePatologias';
import type { PatologiaEspecieItemResponse } from '../types';

interface Props {
  idEspecie: number;
}

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; patologia: PatologiaEspecieItemResponse }
  | { tipo: 'desactivar'; patologia: PatologiaEspecieItemResponse };

interface FormValues {
  nombre: string;
  descripcion: string;
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
    return formatearFecha(iso, { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function PatologiaModal({
  patologia,
  idEspecie,
  saving,
  saveError,
  onClose,
  onRegistrar,
  onEditar,
}: {
  patologia: PatologiaEspecieItemResponse | null;
  idEspecie: number;
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: import('../types').RegistrarPatologiaDTO) => Promise<boolean>;
  onEditar: (id: number, dto: import('../types').EditarPatologiaDTO) => Promise<boolean>;
}) {
  const { t } = useT('configuration');
  const modoEditar = patologia !== null;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  const descValue = watch('descripcion', '');

  useEffect(() => {
    if (patologia) {
      reset({ nombre: patologia.nombre, descripcion: patologia.descripcion ?? '' });
    } else {
      reset({ nombre: '', descripcion: '' });
    }
  }, [patologia, reset]);

  const onSubmit = async (data: FormValues) => {
    const descripcion = data.descripcion.trim() || undefined;
    let ok: boolean;
    if (modoEditar && patologia) {
      ok = await onEditar(patologia.id_especies_patologias, {
        nombre: data.nombre.trim(),
        descripcion,
        fecha_actualizacion: patologia.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({ id_especie: idEspecie, nombre: data.nombre.trim(), descripcion });
    }
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="patologia-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="patologia-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {modoEditar ? `Editar patología — ${patologia!.nombre}` : 'Nueva patología'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('patologiassection.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        {saveError && (
          <Alert
            variant="error"
            title={saveError.status === 412 ? t('patologiassection.conflicto_de_edicion') : t('patologiassection.error_al_guardar')}
            description={saveError.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <Input
              label={t('patologiassection.nombre')}
              required
              aria-required="true"
              placeholder={t('patologiassection.ej_mastitis_fiebre_aftosa')}
              error={errors.nombre?.message}
              {...register('nombre', {
                required: t('patologiassection.el_nombre_es_obligatorio'),
                minLength: { value: 3, message: t('patologiassection.minimo_3_caracteres') },
                maxLength: { value: 50, message: t('patologiassection.maximo_50_caracteres') },
              })}
            />
            <div>
              <label htmlFor="patologia-desc" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>{t('patologiassection.descripcion')}</label>
              <textarea
                id="patologia-desc"
                style={{ width: '100%', minHeight: 80, padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none' }}
                placeholder={t('patologiassection.descripcion_opcional_de_la_patologia')}
                {...register('descripcion', { maxLength: { value: 255, message: t('patologiassection.maximo_255_caracteres') } })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--s1)' }}>
                {errors.descripcion ? (
                  <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)' }}>{errors.descripcion.message}</p>
                ) : <span />}
                <span style={{ fontSize: '11px', color: (descValue?.length ?? 0) > 240 ? 'var(--sem-warning)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {descValue?.length ?? 0} / 255
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('patologiassection.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              {modoEditar ? 'Guardar cambios' : 'Registrar patología'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDesactivar({ patologia, saving, onCancel, onConfirm }: { patologia: PatologiaEspecieItemResponse; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useT('configuration');
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('patologiassection.confirmar_desactivacion')}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>
          ¿Deseas desactivar la patología "{patologia.nombre}"? Los registros históricos permanecerán accesibles.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('patologiassection.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('patologiassection.desactivar')}</Button>
        </div>
      </div>
    </div>
  );
}

export function PatologiasSection({ idEspecie }: Props) {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(18, 1);
  const puedeEditar = usePermission(18, 3);
  const puedeDesact = usePermission(18, 4);

  const { patologias, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = usePatologias();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(idEspecie); }, [cargar, idEspecie]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (p: PatologiaEspecieItemResponse) => {
    setAccionError(null);
    const ok = await desactivar(p.id_especies_patologias);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const activas = patologias.filter((p) => p.es_activo).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('patologiassection.patologias')}</h3>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activas} activas · {patologias.length - activas} inactivas
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(idEspecie)} aria-label={t('patologiassection.recargar_patologias')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('patologiassection.nueva_patologia')}</Button>
          )}
        </div>
      </div>

      {!online && (
        <Alert variant="warning" title={t('patologiassection.sin_conexion')} description={t('patologiassection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('patologiassection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {accionError && (
        <Alert variant="error" title={t('patologiassection.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : patologias.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>{t('patologiassection.no_hay_patologias_registradas_para_esta')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['#', 'Nombre', 'Descripción', 'Estado', 'Actualizado', 'Acciones'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patologias.map((p) => (
                <tr key={p.id_especies_patologias} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{p.id_especies_patologias}</td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{p.nombre}</td>
                  <td style={{ ...TD, color: 'var(--text-secondary)', fontSize: '12px', maxWidth: 260 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.descripcion ?? undefined}>
                      {p.descripcion ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}
                    </span>
                  </td>
                  <td style={TD}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: p.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)', color: p.es_activo ? 'var(--sem-success)' : 'var(--text-muted)', border: `1px solid ${p.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                      {p.es_activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatFecha(p.fecha_actualizacion)}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', patologia: p })} aria-label={`Editar ${p.nombre}`}>
                          <Pencil size={15} aria-hidden />
                        </Button>
                      )}
                      {puedeDesact && p.es_activo && online && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', patologia: p })} aria-label={`Desactivar ${p.nombre}`}>
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
        <PatologiaModal
          patologia={modal.tipo === 'editar' ? modal.patologia : null}
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
          patologia={modal.patologia}
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.patologia)}
        />
      )}
    </div>
  );
}
