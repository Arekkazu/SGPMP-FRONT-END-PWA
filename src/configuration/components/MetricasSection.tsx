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
import { useMetricasProduccion } from '../hooks/useMetricasProduccion';
import type { MetricaProduccionResponse, TipoMedicion, TipoActivo } from '../types';

interface Props {
  idEspecie: number;
}

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; metrica: MetricaProduccionResponse }
  | { tipo: 'desactivar'; metrica: MetricaProduccionResponse };

interface FormValues {
  nombre: string;
  unidad_medida: string;
  tipo_medicion: TipoMedicion;
  aplica_a_tipo_activo: TipoActivo;
}

const TIPO_MEDICION_LABELS: Record<TipoMedicion, string> = {
  PESO: 'Peso',
  VOLUMEN: 'Volumen',
  LONGITUD: 'Longitud',
  CONTEO: 'Conteo',
  OTRO: 'Otro',
};

const TIPO_ACTIVO_LABELS: Record<TipoActivo, string> = {
  INDIVIDUAL: 'Individual',
  LOTE: 'Lote',
  AMBOS: 'Ambos',
};

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

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatearFecha(iso, { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function MetricaModal({
  metrica,
  idEspecie,
  saving,
  saveError,
  onClose,
  onRegistrar,
  onEditar,
}: {
  metrica: MetricaProduccionResponse | null;
  idEspecie: number;
  saving: boolean;
  saveError: import('../../shared/api/errors').ApiError | null;
  onClose: () => void;
  onRegistrar: (dto: import('../types').RegistrarMetricaDTO) => Promise<boolean>;
  onEditar: (id: number, dto: import('../types').EditarMetricaDTO) => Promise<boolean>;
}) {
  const { t } = useT('configuration');
  const modoEditar = metrica !== null;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    if (metrica) {
      reset({
        nombre: metrica.nombre,
        unidad_medida: metrica.unidad_medida,
        tipo_medicion: metrica.tipo_medicion,
        aplica_a_tipo_activo: metrica.aplica_a_tipo_activo,
      });
    } else {
      reset({ nombre: '', unidad_medida: '', tipo_medicion: 'PESO', aplica_a_tipo_activo: 'AMBOS' });
    }
  }, [metrica, reset]);

  const onSubmit = async (data: FormValues) => {
    let ok: boolean;
    if (modoEditar && metrica) {
      ok = await onEditar(metrica.id_metrica_produccion, {
        nombre: data.nombre.trim(),
        unidad_medida: data.unidad_medida.trim(),
        tipo_medicion: data.tipo_medicion,
        aplica_a_tipo_activo: data.aplica_a_tipo_activo,
        fecha_actualizacion: metrica.fecha_actualizacion ?? new Date().toISOString(),
      });
    } else {
      ok = await onRegistrar({
        id_especie: idEspecie,
        nombre: data.nombre.trim(),
        unidad_medida: data.unidad_medida.trim(),
        tipo_medicion: data.tipo_medicion,
        aplica_a_tipo_activo: data.aplica_a_tipo_activo,
      });
    }
    if (ok) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="metrica-modal-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
          <h2 id="metrica-modal-title" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {modoEditar ? `Editar métrica — ${metrica!.nombre}` : 'Nueva métrica de producción'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('metricassection.cerrar')}>
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
              label={t('metricassection.nombre')}
              required
              aria-required="true"
              placeholder={t('metricassection.ej_peso_vivo_produccion_de_leche')}
              error={errors.nombre?.message}
              {...register('nombre', {
                required: 'El nombre es obligatorio.',
                minLength: { value: 3, message: 'Mínimo 3 caracteres.' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres.' },
              })}
            />

            <Input
              label={t('metricassection.unidad_de_medida')}
              required
              aria-required="true"
              placeholder={t('metricassection.ej_kg_l_cm_unidades')}
              error={errors.unidad_medida?.message}
              {...register('unidad_medida', {
                required: 'La unidad es obligatoria.',
                minLength: { value: 1, message: 'Campo obligatorio.' },
                maxLength: { value: 20, message: 'Máximo 20 caracteres.' },
              })}
            />

            <div>
              <label htmlFor="tipo-medicion" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>{t('metricassection.tipo_de_medicion')}<span style={{ color: 'var(--sem-error)' }}>*</span>
              </label>
              <select
                id="tipo-medicion"
                style={SELECT_STYLE}
                aria-required="true"
                {...register('tipo_medicion', { required: 'Selecciona un tipo.' })}
              >
                {(Object.entries(TIPO_MEDICION_LABELS) as [TipoMedicion, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {errors.tipo_medicion && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                  {errors.tipo_medicion.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="aplica-tipo-activo" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--s1)' }}>{t('metricassection.aplica_a_tipo_de_activo')}<span style={{ color: 'var(--sem-error)' }}>*</span>
              </label>
              <select
                id="aplica-tipo-activo"
                style={SELECT_STYLE}
                aria-required="true"
                {...register('aplica_a_tipo_activo', { required: 'Selecciona un tipo.' })}
              >
                {(Object.entries(TIPO_ACTIVO_LABELS) as [TipoActivo, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {errors.aplica_a_tipo_activo && (
                <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', marginTop: 'var(--s1)' }}>
                  {errors.aplica_a_tipo_activo.message}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', marginTop: 'var(--s6)' }}>
            <Button type="button" variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('metricassection.cancelar')}</Button>
            <Button type="submit" variant="primary" size="md" loading={saving}>
              {modoEditar ? 'Guardar cambios' : 'Registrar métrica'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDesactivar({ metrica, saving, onCancel, onConfirm }: { metrica: MetricaProduccionResponse; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useT('configuration');
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('metricassection.confirmar_desactivacion')}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>
          ¿Deseas desactivar la métrica "{metrica.nombre}"? Los registros históricos permanecerán accesibles.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('metricassection.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('metricassection.desactivar')}</Button>
        </div>
      </div>
    </div>
  );
}

export function MetricasSection({ idEspecie }: Props) {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(19, 1);
  const puedeEditar = usePermission(19, 3);
  const puedeDesact = usePermission(19, 4);

  const { metricas, loading, saving, error, saveError, cargar, registrar, editar, desactivar } = useMetricasProduccion();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargar(idEspecie); }, [cargar, idEspecie]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (m: MetricaProduccionResponse) => {
    setAccionError(null);
    const ok = await desactivar(m.id_metrica_produccion);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const activas = metricas.filter((m) => m.es_activo).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('metricassection.metricas_de_produccion')}</h3>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activas} activas · {metricas.length - activas} inactivas
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(idEspecie)} aria-label={t('metricassection.recargar_metricas')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('metricassection.nueva_metrica')}</Button>
          )}
        </div>
      </div>

      {!online && (
        <Alert variant="warning" title={t('metricassection.sin_conexion')} description={t('metricassection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('metricassection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {accionError && (
        <Alert variant="error" title={t('metricassection.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : metricas.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>{t('metricassection.no_hay_metricas_registradas_para_esta')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                {['#', 'Nombre', 'Unidad', 'Tipo medición', 'Aplica a', 'Estado', 'Actualizado', 'Acciones'].map((h) => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => (
                <tr key={m.id_metrica_produccion} style={{ background: 'var(--surface-card)' }}>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{m.id_metrica_produccion}</td>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{m.nombre}</td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{m.unidad_medida}</td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {TIPO_MEDICION_LABELS[m.tipo_medicion] ?? m.tipo_medicion}
                  </td>
                  <td style={{ ...TD, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {TIPO_ACTIVO_LABELS[m.aplica_a_tipo_activo] ?? m.aplica_a_tipo_activo}
                  </td>
                  <td style={TD}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: m.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)', color: m.es_activo ? 'var(--sem-success)' : 'var(--text-muted)', border: `1px solid ${m.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                      {m.es_activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatFecha(m.fecha_actualizacion)}</td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', metrica: m })} aria-label={`Editar ${m.nombre}`}>
                          <Pencil size={15} aria-hidden />
                        </Button>
                      )}
                      {puedeDesact && m.es_activo && online && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', metrica: m })} aria-label={`Desactivar ${m.nombre}`}>
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
        <MetricaModal
          metrica={modal.tipo === 'editar' ? modal.metrica : null}
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
          metrica={modal.metrica}
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.metrica)}
        />
      )}
    </div>
  );
}
