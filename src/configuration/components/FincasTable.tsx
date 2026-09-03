import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Plus, RefreshCw, Pencil, PowerOff, RotateCcw } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useFincas } from '../hooks/useFincas';
import { FincaModal } from './FincaModal';
import type { FincaResponse } from '../types';

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'editar'; finca: FincaResponse }
  | { tipo: 'desactivar'; finca: FincaResponse }
  | { tipo: 'reactivar'; finca: FincaResponse };

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

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function ConfirmModal({ titulo, mensaje, confirmLabel, confirmVariant, saving, onCancel, onConfirm }: {
  titulo: string; mensaje: string; confirmLabel: string;
  confirmVariant: 'danger' | 'primary'; saving: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useT('configuration');
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{titulo}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{mensaje}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('fincastable.cancelar')}</Button>
          <Button variant={confirmVariant} size="md" loading={saving} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function FincasTable() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(9, 1);
  const puedeEditar = usePermission(9, 3);
  const puedeDesact = usePermission(9, 4);

  const { fincas, loading, saving, error, saveError, fromCache, cargar, registrar, editar, desactivar, reactivar } = useFincas();
  const [modal, setModal]       = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { cargar(); }, [cargar]);

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (f: FincaResponse) => {
    setAccionError(null);
    const ok = await desactivar(f.id_finca);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const handleReactivar = async (f: FincaResponse) => {
    setAccionError(null);
    const ok = await reactivar(f.id_finca);
    if (!ok) setAccionError(saveError?.message ?? 'Error al reactivar.');
    else cerrar();
  };

  const fincasFiltradas = fincas.filter((f) =>
    f.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const activas   = fincas.filter((f) => f.es_activo).length;
  const inactivas = fincas.length - activas;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('fincastable.gestion_de_fincas')}</h2>
          {!loading && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0, fontFamily: 'var(--font-mono)' }}>
              {activas} activas · {inactivas} inactivas{fromCache && ' · desde caché'}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          {/* búsqueda */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={t('fincastable.buscar_por_nombre')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: 'var(--s2) var(--s3)', paddingLeft: 'var(--s7)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-sans)', outline: 'none', width: 200 }}
              aria-label={t('fincastable.buscar_fincas')}
            />
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          </div>
          <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('fincastable.recargar_fincas')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('fincastable.nueva_finca')}</Button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {!online && <Alert variant="warning" title={t('fincastable.sin_conexion')} description={t('fincastable.mostrando_datos_cacheados_las_acciones_de')} style={{ marginBottom: 'var(--s4)' }} />}
      {fromCache && online && <Alert variant="info" title={t('fincastable.datos_desde_cache')} description={t('fincastable.no_se_pudo_conectar_con_el_servidor_se')} style={{ marginBottom: 'var(--s4)' }} />}
      {error && !fromCache && <Alert variant="error" title={t('fincastable.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {accionError && <Alert variant="error" title={t('fincastable.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />}

      {/* Tabla */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : fincasFiltradas.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>
          {busqueda ? 'Sin resultados para la búsqueda.' : 'No hay fincas registradas.'}
        </p>
      ) : (
        <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ background: 'var(--surface-hover)', padding: 'var(--s2) var(--s4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('fincastable.fincas_registradas')}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>
              {activas} activas · {inactivas} inactivas
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                  {['#', 'Nombre', 'Ubicación', 'Tamaño', 'Productor', 'Estado', 'Actualización', 'Acciones'].map((h) => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fincasFiltradas.map((f) => (
                  <tr key={f.id_finca} style={{ background: 'var(--surface-card)' }}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>#{f.id_finca}</td>
                    <td style={TD}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{f.nombre}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        vereda: {f.ubicacion.vereda || '—'}
                      </div>
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {f.ubicacion.departamento}, {f.ubicacion.municipio}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {Number(f.ubicacion.latitud).toFixed(6)}, {Number(f.ubicacion.longitud).toFixed(6)}
                      </div>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.tamano_h}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 4 }}>ha</span>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {f.id_usuario != null ? `#${f.id_usuario}` : '—'}
                    </td>
                    <td style={TD}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', padding: '2px var(--s2)', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 600, background: f.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)', color: f.es_activo ? 'var(--sem-success)' : 'var(--text-muted)', border: `1px solid ${f.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                        {f.es_activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatFecha(f.fecha_actualizacion)}
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
                        {puedeEditar && online && (
                          <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'editar', finca: f })} aria-label={`Editar ${f.nombre}`}>
                            <Pencil size={15} aria-hidden />
                          </Button>
                        )}
                        {puedeDesact && f.es_activo && online && (
                          <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'desactivar', finca: f })} aria-label={`Desactivar ${f.nombre}`}>
                            <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                          </Button>
                        )}
                        {puedeDesact && !f.es_activo && online && (
                          <Button variant="ghost" size="sm" onClick={() => setModal({ tipo: 'reactivar', finca: f })} aria-label={`Reactivar ${f.nombre}`}>
                            <RotateCcw size={15} aria-hidden style={{ color: 'var(--sem-success)' }} />
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

      {/* Modales */}
      {(modal.tipo === 'crear' || modal.tipo === 'editar') && (
        <FincaModal
          finca={modal.tipo === 'editar' ? modal.finca : null}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onRegistrar={registrar}
          onEditar={editar}
        />
      )}
      {modal.tipo === 'desactivar' && (
        <ConfirmModal
          titulo="Confirmar desactivación"
          mensaje={`¿Deseas desactivar la finca "${modal.finca.nombre}"? Los datos históricos permanecerán accesibles.`}
          confirmLabel="Desactivar"
          confirmVariant="danger"
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleDesactivar(modal.finca)}
        />
      )}
      {modal.tipo === 'reactivar' && (
        <ConfirmModal
          titulo="Reactivar finca"
          mensaje={`¿Confirmas la reactivación de "${modal.finca.nombre}"? Volverá a estar disponible en todos los módulos.`}
          confirmLabel="Reactivar"
          confirmVariant="primary"
          saving={saving}
          onCancel={cerrar}
          onConfirm={() => handleReactivar(modal.finca)}
        />
      )}
    </div>
  );
}
