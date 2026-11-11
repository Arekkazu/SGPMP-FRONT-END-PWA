// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-10 | Arekkazu | #512 RF-16/RF-37: ciclos productivos con sus fases en orden |
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import type { ApiError } from '../../shared/api/errors';
import { avisarExito } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { usePermission } from '../../shared/rbac/usePermission';
import { ciclosApi, ciclosProductivosApi } from '../api/especiesConfigApi';
import type { CicloBiologicoResponse, CicloProductivoResponse } from '../types';

const RECURSO_ETAPAS = 17; // ciclos_biologicos: el mismo permiso de las etapas
const TH: React.CSSProperties = { padding: 'var(--s2) var(--s4)', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', verticalAlign: 'top' };
export const SELECT: React.CSSProperties = {
  width: '100%', padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-sans)',
};

function CicloModal({ ciclo, etapas, onCerrar, onGuardar }: {
  ciclo: CicloProductivoResponse | null;
  etapas: CicloBiologicoResponse[];
  onCerrar: () => void;
  onGuardar: (nombre: string, fases: number[]) => Promise<ApiError | null>;
}) {
  const { t } = useT('configuration');
  const [nombre, setNombre] = useState(ciclo?.nombre ?? '');
  const [fases, setFases] = useState<number[]>(ciclo?.fases.map((f) => f.id_ciclo_biologico) ?? []);
  const [agregar, setAgregar] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const bloqueado = !!ciclo?.en_uso;
  const nombreEtapa = (id: number) => etapas.find((e) => e.id_ciclo_biologico === id)?.nombre
    ?? ciclo?.fases.find((f) => f.id_ciclo_biologico === id)?.nombre ?? '';
  const disponibles = etapas.filter((e) => !fases.includes(e.id_ciclo_biologico));
  const errorNombre = enviado && (nombre.trim().length < 3 || nombre.trim().length > 100) ? t('ciclosproductivos.error_nombre') : undefined;
  const errorFases = enviado && fases.length === 0 ? t('ciclosproductivos.error_fases') : undefined;

  const mover = (i: number, delta: number) => setFases((f) => {
    const n = [...f]; [n[i], n[i + delta]] = [n[i + delta], n[i]]; return n;
  });
  const guardar = async () => {
    setEnviado(true);
    if (nombre.trim().length < 3 || nombre.trim().length > 100 || fases.length === 0) return;
    setGuardando(true);
    const e = await onGuardar(nombre.trim(), fases);
    setGuardando(false);
    setError(e);
  };

  return (
    <ModalShell title={ciclo ? t('ciclosproductivos.editar_titulo', { nombre: ciclo.nombre }) : t('ciclosproductivos.nuevo_titulo')} onClose={onCerrar} maxWidth={560}
      footer={(
        <>
          <Button variant="ghost" size="md" onClick={onCerrar}>{t('ciclosproductivos.cancelar')}</Button>
          <Button variant="primary" size="md" loading={guardando} onClick={guardar}>{t('ciclosproductivos.guardar')}</Button>
        </>
      )}>
      {error && <Alert variant="error" title={t('ciclosproductivos.error_guardar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      <Input label={t('ciclosproductivos.nombre')} value={nombre} onChange={(e) => setNombre(e.target.value)} error={errorNombre} required maxLength={100} />
      <fieldset style={{ border: 0, padding: 0, margin: 'var(--s4) 0 0' }} aria-describedby={errorFases ? 'ciclo-fases-error' : undefined}>
        <legend style={{ fontWeight: 600, fontSize: '13px', marginBottom: 'var(--s2)' }}>{t('ciclosproductivos.fases_en_orden')}</legend>
        {bloqueado && <Alert variant="info" title={t('ciclosproductivos.en_uso_titulo')} description={t('ciclosproductivos.en_uso_detalle')} style={{ marginBottom: 'var(--s3)' }} />}
        {fases.length === 0
          ? <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 var(--s3)' }}>{t('ciclosproductivos.sin_fases_elegidas')}</p>
          : (
            <ol style={{ margin: '0 0 var(--s3)', paddingLeft: 'var(--s5)', display: 'grid', gap: 'var(--s2)' }}>
              {fases.map((id, i) => (
                <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                  <span style={{ flex: 1 }}>{nombreEtapa(id)}</span>
                  {!bloqueado && (
                    <>
                      <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={t('ciclosproductivos.subir', { etapa: nombreEtapa(id) })}><ArrowUp size={14} aria-hidden /></Button>
                      <Button variant="ghost" size="sm" disabled={i === fases.length - 1} onClick={() => mover(i, 1)} aria-label={t('ciclosproductivos.bajar', { etapa: nombreEtapa(id) })}><ArrowDown size={14} aria-hidden /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setFases((f) => f.filter((x) => x !== id))} aria-label={t('ciclosproductivos.quitar', { etapa: nombreEtapa(id) })}><X size={14} aria-hidden /></Button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        {errorFases && <p id="ciclo-fases-error" role="alert" style={{ color: 'var(--sem-error)', fontSize: '12px', margin: '0 0 var(--s2)' }}>{errorFases}</p>}
        {!bloqueado && disponibles.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'flex-end' }}>
            <label style={{ flex: 1, display: 'grid', gap: 'var(--s1)', fontSize: '13px' }}>
              {t('ciclosproductivos.agregar_etapa')}
              <select style={SELECT} value={agregar} onChange={(e) => setAgregar(e.target.value)}>
                <option value="">{t('ciclosproductivos.elegir_etapa')}</option>
                {disponibles.map((e) => <option key={e.id_ciclo_biologico} value={e.id_ciclo_biologico}>{t('ciclosproductivos.etapa_opcion', { nombre: e.nombre, dias: e.duracion_dias })}</option>)}
              </select>
            </label>
            <Button variant="secondary" size="md" disabled={!agregar} onClick={() => { setFases((f) => [...f, Number(agregar)]); setAgregar(''); }}>
              <Plus size={14} aria-hidden />{t('ciclosproductivos.agregar')}
            </Button>
          </div>
        )}
      </fieldset>
    </ModalShell>
  );
}

export function CiclosProductivosSection({ idEspecie }: { idEspecie: number }) {
  const { t } = useT('configuration');
  const puedeCrear = usePermission(RECURSO_ETAPAS, 1);
  const puedeEditar = usePermission(RECURSO_ETAPAS, 3);
  const puedeEliminar = usePermission(RECURSO_ETAPAS, 4);
  const [ciclos, setCiclos] = useState<CicloProductivoResponse[]>([]);
  const [etapas, setEtapas] = useState<CicloBiologicoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [modal, setModal] = useState<CicloProductivoResponse | 'nuevo' | null>(null);
  const [eliminando, setEliminando] = useState<CicloProductivoResponse | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<ApiError | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [c, e] = await Promise.all([ciclosProductivosApi.listar(idEspecie), ciclosApi.listar(idEspecie, true)]);
      setCiclos(c); setEtapas(e);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setCargando(false);
    }
  }, [idEspecie]);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (nombre: string, fases: number[]): Promise<ApiError | null> => {
    try {
      const guardado = modal && modal !== 'nuevo'
        ? await ciclosProductivosApi.editar(modal.id_ciclo_productivo, { nombre, id_ciclos_biologicos: fases })
        : await ciclosProductivosApi.registrar(idEspecie, { nombre, id_ciclos_biologicos: fases });
      avisarExito(modal === 'nuevo' ? 'registrado' : 'guardado', guardado.nombre);
      setModal(null);
      cargar();
      return null;
    } catch (e) {
      return e as ApiError;
    }
  };
  const eliminar = async (ciclo: CicloProductivoResponse) => {
    setErrorEliminar(null);
    try {
      await ciclosProductivosApi.eliminar(ciclo.id_ciclo_productivo);
      avisarExito('eliminado', ciclo.nombre);
      setEliminando(null);
      cargar();
    } catch (e) {
      setErrorEliminar(e as ApiError);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{t('ciclosproductivos.titulo')}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 0' }}>{t('ciclosproductivos.ayuda')}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={cargar} aria-label={t('ciclosproductivos.recargar')}><RefreshCw size={15} aria-hidden /></Button>
          {puedeCrear && etapas.length > 0 && (
            <Button variant="primary" size="sm" onClick={() => setModal('nuevo')}><Plus size={15} aria-hidden />{t('ciclosproductivos.nuevo')}</Button>
          )}
        </div>
      </div>
      {error && <Alert variant="error" title={t('ciclosproductivos.error_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
      {errorEliminar && <Alert variant="error" title={t('ciclosproductivos.error_eliminar')} description={errorEliminar.message} style={{ marginBottom: 'var(--s4)' }} />}
      {!cargando && !error && etapas.length === 0 && (
        <Alert variant="info" title={t('ciclosproductivos.sin_etapas_titulo')} description={t('ciclosproductivos.sin_etapas_detalle')} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {cargando ? <p style={{ color: 'var(--text-muted)' }}>{t('ciclosproductivos.cargando')}</p>
        : ciclos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s6) 0', fontSize: '14px' }}>{t('ciclosproductivos.vacio')}</p>
        ) : (
          <ScrollRegion label={t('ciclosproductivos.titulo')}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                  <th style={TH}>{t('ciclosproductivos.col_nombre')}</th><th style={TH}>{t('ciclosproductivos.col_fases')}</th>
                  <th style={TH}>{t('ciclosproductivos.col_duracion')}</th><th style={TH}>{t('ciclosproductivos.col_uso')}</th>
                  <th style={TH}><span className="ds-sr-only">{t('ciclosproductivos.col_acciones')}</span></th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((c) => (
                  <tr key={c.id_ciclo_productivo}>
                    <td style={{ ...TD, fontWeight: 600 }}>{c.nombre}</td>
                    <td style={TD}>
                      <ol style={{ margin: 0, paddingLeft: 'var(--s4)' }}>{c.fases.map((f) => <li key={f.orden}>{f.nombre}</li>)}</ol>
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{t('ciclosproductivos.dias', { count: c.duracion_dias })}</td>
                    <td style={TD}>{c.en_uso ? t('ciclosproductivos.en_uso') : t('ciclosproductivos.sin_uso')}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {puedeEditar && <Button variant="ghost" size="sm" onClick={() => setModal(c)} aria-label={t('ciclosproductivos.editar_aria', { nombre: c.nombre })}><Pencil size={15} aria-hidden /></Button>}
                      {puedeEliminar && !c.en_uso && <Button variant="ghost" size="sm" onClick={() => setEliminando(c)} aria-label={t('ciclosproductivos.eliminar_aria', { nombre: c.nombre })}><Trash2 size={15} aria-hidden style={{ color: 'var(--sem-error)' }} /></Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        )}
      {modal && <CicloModal ciclo={modal === 'nuevo' ? null : modal} etapas={etapas} onCerrar={() => setModal(null)} onGuardar={guardar} />}
      {eliminando && (
        <ModalShell title={t('ciclosproductivos.eliminar_titulo', { nombre: eliminando.nombre })} onClose={() => setEliminando(null)}
          footer={(
            <>
              <Button variant="ghost" size="md" onClick={() => setEliminando(null)}>{t('ciclosproductivos.cancelar')}</Button>
              <Button variant="danger" size="md" onClick={() => eliminar(eliminando)}>{t('ciclosproductivos.eliminar')}</Button>
            </>
          )}>
          <p style={{ margin: 0 }}>{t('ciclosproductivos.eliminar_detalle')}</p>
        </ModalShell>
      )}
    </div>
  );
}
