// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #391/#392 RF-16: densidad máxima por etapa |
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Pencil, RefreshCw } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { ciclosApi } from '../api/especiesConfigApi';
import type { CicloBiologicoResponse } from '../types';
import { SELECT } from './CiclosProductivosSection';

const AVISOS = [80, 85, 90, 95] as const;
const TH: React.CSSProperties = { padding: 'var(--s2) var(--s4)', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)' };

const decimal = (v: string) => Number(v.replace(',', '.'));

/** Validación de RF-16 por etapa (#391): la misma regla que el backend, para decirlo junto al campo. */
export function validarDensidad(densidad: string, biomasa: string): { densidad?: string; biomasa?: string } {
  const errores: { densidad?: string; biomasa?: string } = {};
  const d = decimal(densidad);
  if (!densidad.trim() || !Number.isFinite(d) || d <= 0 || d > 200) errores.densidad = 'densidad';
  const b = decimal(biomasa);
  if (biomasa.trim() && (!Number.isFinite(b) || b <= 0)) errores.biomasa = 'biomasa';
  return errores;
}

function DensidadModal({ etapa, onCerrar, onGuardado }: {
  etapa: CicloBiologicoResponse; onCerrar: () => void; onGuardado: (e: CicloBiologicoResponse) => void;
}) {
  const { t } = useT('configuration');
  const [densidad, setDensidad] = useState(etapa.densidad_maxima ?? '');
  const [biomasa, setBiomasa] = useState(etapa.biomasa_maxima ?? '');
  const [aviso, setAviso] = useState<(typeof AVISOS)[number]>((etapa.aviso_preventivo_pct ?? 90) as (typeof AVISOS)[number]);
  const [area, setArea] = useState('100');
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const errores = enviado ? validarDensidad(densidad, biomasa) : {};
  const caben = Number.isFinite(decimal(densidad)) && decimal(densidad) > 0 && decimal(area) > 0
    ? Math.floor(decimal(densidad) * decimal(area)) : null;

  const guardar = async () => {
    setEnviado(true);
    const e = validarDensidad(densidad, biomasa);
    if (e.densidad || e.biomasa) return;
    setGuardando(true); setError(null);
    try {
      const guardada = await ciclosApi.configurarDensidad(etapa.id_ciclo_biologico, {
        densidad_maxima: String(decimal(densidad)), biomasa_maxima: biomasa.trim() ? String(decimal(biomasa)) : null,
        aviso_preventivo_pct: aviso, fecha_actualizacion: etapa.fecha_actualizacion,
      });
      avisarExito('guardado', guardada.nombre);
      onGuardado(guardada);
    } catch (ex) {
      setError(ex as ApiError);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell title={t('densidadetapas.modal_titulo', { etapa: etapa.nombre })} onClose={onCerrar}
      footer={(
        <>
          <Button variant="ghost" size="md" onClick={onCerrar}>{t('densidadetapas.cancelar')}</Button>
          <Button variant="primary" size="md" loading={guardando} onClick={guardar}>{t('densidadetapas.guardar')}</Button>
        </>
      )}>
      {error && (
        <Alert variant="error" style={{ marginBottom: 'var(--s4)' }} description={error.message}
          title={error.status === 412 ? t('densidadetapas.conflicto') : t('densidadetapas.error_guardar')} />
      )}
      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        <Input label={t('densidadetapas.densidad_label')} hint={t('densidadetapas.densidad_ayuda')} inputMode="decimal" required
          value={densidad} onChange={(e) => setDensidad(e.target.value)} error={errores.densidad && t('densidadetapas.error_densidad')} />
        <Input label={t('densidadetapas.biomasa_label')} hint={t('densidadetapas.biomasa_ayuda')} inputMode="decimal"
          value={biomasa} onChange={(e) => setBiomasa(e.target.value)} error={errores.biomasa && t('densidadetapas.error_biomasa')} />
        <label style={{ display: 'grid', gap: 'var(--s1)', fontSize: '13px' }}>
          {t('densidadetapas.aviso_label')}
          <select style={SELECT} value={aviso} onChange={(e) => setAviso(Number(e.target.value) as (typeof AVISOS)[number])}>
            {AVISOS.map((a) => <option key={a} value={a}>{t('densidadetapas.aviso_opcion', { pct: a })}</option>)}
          </select>
        </label>
        <div style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', fontSize: '13px' }}>
          <Input label={t('densidadetapas.ejemplo_area')} inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
          <p aria-live="polite" style={{ margin: 'var(--s2) 0 0' }}>
            {caben === null ? t('densidadetapas.ejemplo_vacio') : t('densidadetapas.ejemplo', { count: caben, area: area, aviso: Math.floor(caben * aviso / 100) })}
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

export function DensidadEtapasSection({ idEspecie }: { idEspecie: number }) {
  const { t } = useT('configuration');
  const puedeEditar = usePermission(17, 3);
  const [etapas, setEtapas] = useState<CicloBiologicoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [editando, setEditando] = useState<CicloBiologicoResponse | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      setEtapas(await ciclosApi.listar(idEspecie, true));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setCargando(false);
    }
  }, [idEspecie]);
  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('densidadetapas.titulo')}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 0' }}>{t('densidadetapas.ayuda')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={cargar} aria-label={t('densidadetapas.recargar')}><RefreshCw size={15} aria-hidden /></Button>
      </div>
      {!puedeEditar && <Alert variant="info" title={t('densidadetapas.solo_lectura')} style={{ marginBottom: 'var(--s4)' }} />}
      {error && <Alert variant="error" title={t('densidadetapas.error_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {cargando ? <p style={{ color: 'var(--text-muted)' }}>{t('densidadetapas.cargando')}</p>
        : etapas.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s6) 0', fontSize: '14px' }}>{t('densidadetapas.vacio')}</p>
        ) : (
          <ScrollRegion label={t('densidadetapas.titulo')}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                  <th style={TH}>{t('densidadetapas.col_etapa')}</th><th style={TH}>{t('densidadetapas.col_densidad')}</th>
                  <th style={TH}>{t('densidadetapas.col_biomasa')}</th><th style={TH}>{t('densidadetapas.col_aviso')}</th>
                  {puedeEditar && <th style={TH}><span className="ds-sr-only">{t('densidadetapas.col_acciones')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {etapas.map((e) => (
                  <tr key={e.id_ciclo_biologico}>
                    <td style={{ ...TD, fontWeight: 600 }}>{e.nombre}</td>
                    <td style={TD}>
                      {e.densidad_maxima
                        ? t('densidadetapas.por_m2', { valor: Number(e.densidad_maxima) })
                        : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', color: 'var(--sem-warning)' }}>
                            <AlertTriangle size={14} aria-hidden />{t('densidadetapas.sin_configurar')}
                          </span>
                        )}
                    </td>
                    <td style={TD}>{e.biomasa_maxima ? t('densidadetapas.kg_m2', { valor: Number(e.biomasa_maxima) }) : t('densidadetapas.sin_limite')}</td>
                    <td style={TD}>{t('densidadetapas.aviso_opcion', { pct: e.aviso_preventivo_pct ?? 90 })}</td>
                    {puedeEditar && (
                      <td style={TD}>
                        <Button variant="ghost" size="sm" onClick={() => setEditando(e)}
                          aria-label={t(e.densidad_maxima ? 'densidadetapas.editar_aria' : 'densidadetapas.configurar_aria', { etapa: e.nombre })}>
                          <Pencil size={15} aria-hidden />{e.densidad_maxima ? t('densidadetapas.editar') : t('densidadetapas.configurar')}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        )}
      {editando && (
        <DensidadModal etapa={editando} onCerrar={() => setEditando(null)}
          onGuardado={(g) => { setEtapas((l) => l.map((x) => (x.id_ciclo_biologico === g.id_ciclo_biologico ? g : x))); setEditando(null); }} />
      )}
    </div>
  );
}
