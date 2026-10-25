// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-69: requisitos para activar, estado OTA, transiciones y notas inmutables |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-07 RF-69: matriz de confusión con ejes Real/Predicho y clases |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Rocket, Save, CheckCircle2, XCircle, Info } from 'lucide-react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { EstadoModeloPill } from './EstadoModeloPill';
import { Pill } from './Pill';
import { etiquetaTipoModelo } from '../types';
import type { DespliegueOtaResponse, EventoAuditoriaM04Response, VersionModeloResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  modelo: VersionModeloResponse | null;
  loading: boolean;
  puedeEditar: boolean;
  puedeEjecutar: boolean;
  online: boolean;
  saving: boolean;
  saveError: ApiError | null;
  /** null = no se pudo consultar (sin permiso de auditoría u OTA, o sin red). */
  transiciones: EventoAuditoriaM04Response[] | null;
  despliegues: DespliegueOtaResponse[] | null;
  onGuardarNotas: (notas: string) => void;
  onSolicitarActivar: () => void;
  onClose: () => void;
}

function pct(v: number | null): string {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`;
}

function Metrica({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: destacado ? 'var(--brand-600)' : 'var(--text-primary)' }}>{valor}</div>
    </div>
  );
}

function Requisito({ ok, texto, valor }: { ok: boolean; texto: string; valor: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s2)', fontSize: '13px' }}>
      {ok ? <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)', flexShrink: 0, marginTop: 1 }} /> : <XCircle size={16} aria-hidden style={{ color: 'var(--sem-error)', flexShrink: 0, marginTop: 1 }} />}
      <span><span style={{ color: 'var(--text-primary)' }}>{texto}</span> <span style={{ color: 'var(--text-muted)' }}>· {valor}</span></span>
    </li>
  );
}

const H3: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' };

export function ModeloDetalleModal({ modelo, loading, puedeEditar, puedeEjecutar, online, saving, saveError, transiciones, despliegues, onGuardarNotas, onSolicitarActivar, onClose }: Props) {
  const { t } = useT('prediction');
  const [notas, setNotas] = useState('');

  useEffect(() => { setNotas(modelo?.notas_validacion ?? ''); }, [modelo?.id_version_modelo]); // eslint-disable-line react-hooks/exhaustive-deps

  const tieneNotas = !!(modelo?.notas_validacion && modelo.notas_validacion.trim());
  const puedeActivar = modelo?.estado_version === 'APROBADO' && tieneNotas && puedeEjecutar && online;
  // CA-13: las notas no se editan una vez registradas; rechazadas y deprecadas solo se consultan.
  const cerrada = modelo?.estado_version === 'RECHAZADO' || modelo?.estado_version === 'DEPRECADO';
  const notasEditables = puedeEditar && !tieneNotas && !cerrada;
  const otaListos = despliegues?.filter((d) => d.estado_despliegue === 'EXITOSO' || d.estado_despliegue === 'SIN_CAMBIOS').length ?? 0;

  return (
    <ModalShell
      title={modelo ? modelo.nombre_version : t('modelodetallemodal.version_de_modelo')}
      onClose={onClose}
      maxWidth={720}
      footer={<Button variant="secondary" onClick={onClose}>{t('modelodetallemodal.cerrar')}</Button>}
    >
      {loading || !modelo ? (
        <div style={{ padding: 'var(--s6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('modelodetallemodal.cargando')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <EstadoModeloPill estado={modelo.estado_version} />
            <Pill tono="neutral">{etiquetaTipoModelo(modelo.tipo_modelo)}</Pill>
            {modelo.paradigma && <Pill tono="neutral">{modelo.paradigma}</Pill>}
            {modelo.componente && <Pill tono="neutral">{modelo.componente}</Pill>}
            {modelo.esta_produccion && <Pill tono="success">{t('modelodetallemodal.en_produccion')}</Pill>}
          </div>

          {saveError && <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('modelodetallemodal.operacion_rechazada')} description={saveError.message} />}

          {cerrada && (
            <p role="note" style={{ display: 'flex', gap: 'var(--s2)', margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Info size={16} aria-hidden style={{ color: 'var(--sem-info)', flexShrink: 0, marginTop: 1 }} />
              {t(modelo.estado_version === 'RECHAZADO' ? 'modelodetallemodal.nota_rechazada' : 'modelodetallemodal.nota_deprecada')}
            </p>
          )}

          {/* Métricas de validación */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('modelodetallemodal.metricas_de_validacion')}</h3>
            {modelo.metricas_poblacionales ? (
              // RFC-009: un modelo POBLACIONAL (no supervisado) se valida por calibración, no por F1/recall.
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s3)' }}>
                <Metrica label={t('modelodetallemodal.calibracion_completada')} valor={modelo.metricas_poblacionales.calibracion_completada ? t('modelodetallemodal.si') : t('modelodetallemodal.no')} destacado />
                <Metrica label={t('modelodetallemodal.tasa_falsos_positivos_rutina')} valor={pct(modelo.metricas_poblacionales.tasa_falsos_positivos_rutina as number ?? null)} />
                <Metrica label={t('modelodetallemodal.tasa_deteccion_eventos_clinicos')} valor={pct(modelo.metricas_poblacionales.tasa_deteccion_eventos_clinicos as number ?? null)} />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s3)' }}>
                <Metrica label={t('modelodetallemodal.f1_global')} valor={pct(modelo.f1_score)} destacado />
                <Metrica label={t('modelodetallemodal.recall_riesgo_alto')} valor={pct(modelo.recall_clase_riesgo_alto)} destacado />
                <Metrica label={t('modelodetallemodal.precision')} valor={pct(modelo.precision_modelo)} />
                <Metrica label={t('modelodetallemodal.accuracy')} valor={pct(modelo.accuracy)} />
                <Metrica label={t('modelodetallemodal.roc_auc')} valor={pct(modelo.roc_auc_score)} />
              </div>
            )}
          </div>

          {modelo.matriz_confusion && modelo.matriz_confusion.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('modelodetallemodal.matriz_de_confusion')}</h3>
              <div style={{ overflowX: 'auto' }}>
                {/* M4-07: ejes y clases con nombre; antes era una cuadrícula de números sin contexto. */}
                <table style={{ borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <caption style={{ captionSide: 'top', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>
                    {t('modelodetallemodal.matriz_ejes')}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ padding: 'var(--s2)', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontWeight: 600 }}>{t('modelodetallemodal.real_predicho')}</th>
                      {modelo.matriz_confusion[0].map((_, j) => (
                        <th key={j} scope="col" style={{ padding: 'var(--s2)', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('modelodetallemodal.clase', { n: j + 1 })}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modelo.matriz_confusion.map((fila, i) => (
                      <tr key={i}>
                        <th scope="row" style={{ padding: 'var(--s2)', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'left' }}>{t('modelodetallemodal.clase', { n: i + 1 })}</th>
                        {fila.map((celda, j) => (
                          <td key={j} style={{ border: '1px solid var(--surface-border)', padding: 'var(--s2) var(--s3)', textAlign: 'center', color: i === j ? 'var(--sem-success)' : 'var(--text-secondary)', fontWeight: i === j ? 700 : 400 }}>
                            {celda}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {modelo.detalle_validacion && (
            <Alert variant="warning" title={t('modelodetallemodal.detalle_de_validacion')} description={modelo.detalle_validacion} />
          )}

          {/* Metadatos y trazabilidad (CA-11) */}
          <section style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
            <h3 style={H3}>{t('modelodetallemodal.metadatos_titulo')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)', fontSize: '12px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>{t('modelodetallemodal.formato')} </span>{modelo.formato_artefacto ?? '—'}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>{t('modelodetallemodal.tamano')}</span>{modelo.tamanio_artefacto_bytes ? `${(modelo.tamanio_artefacto_bytes / 1_048_576).toFixed(1)} MB` : '—'}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>{t('modelodetallemodal.registrada')} </span>{formatearFechaHora(modelo.fecha_registro)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>{t('modelodetallemodal.version_referencia')} </span>{modelo.version_referencia != null ? `#${modelo.version_referencia}` : '—'}</div>
              {[
                [t('modelodetallemodal.hash_sha_256'), modelo.hash_artefacto_sha256],
                [t('modelodetallemodal.hash_dataset'), modelo.dataset_entrenamiento_hash],
                [t('modelodetallemodal.proceso_rf71'), modelo.id_proceso_rf71],
              ].map(([k, v]) => (
                <div key={k} style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans, inherit)' }}>{k} </span>{v ?? '—'}
                </div>
              ))}
            </div>
          </section>

          {/* Historial de transiciones: append-only, sale de la bitácora M04 */}
          {transiciones && (
            <section style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
              <h3 style={H3}>{t('modelodetallemodal.transiciones_titulo')}</h3>
              {transiciones.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{t('modelodetallemodal.sin_transiciones')}</p> : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                  {transiciones.map((e) => (
                    <li key={e.id_evento} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', flexWrap: 'wrap', fontSize: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{e.tipo_evento}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{e.tipo_actor === 'SISTEMA' ? e.id_sistema ?? 'SISTEMA' : t('modelodetallemodal.usuario', { id: e.id_usuario })} · {formatearFechaHora(e.fecha_evento)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {/* Notas de validación clínica */}
          <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>{t('modelodetallemodal.notas_de_validacion_clinica')}</h3>
            {notasEditables ? (
              <>
                <p style={{ margin: '0 0 var(--s2)', fontSize: '12px', color: 'var(--text-muted)' }}>{t('modelodetallemodal.notas_inmutables')}</p>
                <textarea
                  aria-label={t('modelodetallemodal.notas_de_validacion_clinica')}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder={t('modelodetallemodal.registra_la_validacion_clinica_de_esta')}
                  style={{ width: '100%', minHeight: 80, padding: 'var(--s3)', borderRadius: 'var(--r-md)', border: '1.5px solid var(--surface-border)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s2)' }}>
                  <Button variant="secondary" size="sm" loading={saving} disabled={!online || !notas.trim() || notas.trim() === (modelo.notas_validacion ?? '').trim()} onClick={() => onGuardarNotas(notas.trim())}>
                    <Save size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('modelodetallemodal.guardar_notas')}</Button>
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: modelo.notas_validacion ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {modelo.notas_validacion || t('modelodetallemodal.sin_notas')}
              </p>
            )}
          </div>

          {/* Acción de activación */}
          {modelo.estado_version === 'APROBADO' && (
            <section style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
              <h3 style={H3}>{t('modelodetallemodal.requisitos_titulo')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--s4)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
                <Requisito ok texto={t('modelodetallemodal.req_aprobado')} valor={t('modelodetallemodal.req_aprobado_valor')} />
                <Requisito ok={tieneNotas} texto={t('modelodetallemodal.req_notas')} valor={tieneNotas ? t('modelodetallemodal.registradas') : t('modelodetallemodal.sin_notas')} />
              </ul>
              {despliegues && (
                <p style={{ margin: '0 0 var(--s4)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {t('modelodetallemodal.ota_info', { listos: otaListos, total: despliegues.length })}
                </p>
              )}
              {!tieneNotas && puedeEjecutar && (
                <Alert variant="info" title={t('modelodetallemodal.notas_requeridas')} description={t('modelodetallemodal.registra_las_notas_de_validacion_clinica')} style={{ marginBottom: 'var(--s3)' }} />
              )}
              {puedeEjecutar && (
                <Button variant="primary" disabled={!puedeActivar} onClick={onSolicitarActivar}>
                  <Rocket size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('modelodetallemodal.activar_en_produccion')}</Button>
              )}
            </section>
          )}
        </div>
      )}
    </ModalShell>
  );
}
