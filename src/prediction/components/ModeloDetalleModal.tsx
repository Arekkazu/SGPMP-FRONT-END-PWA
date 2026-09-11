import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Rocket, Save } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from './ModalShell';
import { EstadoModeloPill } from './EstadoModeloPill';
import { Pill } from './Pill';
import { TIPO_MODELO_LABEL } from '../types';
import type { VersionModeloResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

interface Props {
  modelo: VersionModeloResponse | null;
  loading: boolean;
  puedeEditar: boolean;
  puedeEjecutar: boolean;
  online: boolean;
  saving: boolean;
  saveError: ApiError | null;
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

export function ModeloDetalleModal({ modelo, loading, puedeEditar, puedeEjecutar, online, saving, saveError, onGuardarNotas, onSolicitarActivar, onClose }: Props) {
  const { t } = useT('prediction');
  const [notas, setNotas] = useState('');

  useEffect(() => { setNotas(modelo?.notas_validacion ?? ''); }, [modelo?.id_version_modelo]); // eslint-disable-line react-hooks/exhaustive-deps

  const tieneNotas = !!(modelo?.notas_validacion && modelo.notas_validacion.trim());
  const puedeActivar = modelo?.estado_version === 'APROBADO' && tieneNotas && puedeEjecutar && online;

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
            <Pill tono="neutral">{TIPO_MODELO_LABEL[modelo.tipo_modelo] ?? modelo.tipo_modelo}</Pill>
            {modelo.esta_produccion && <Pill tono="success">{t('modelodetallemodal.en_produccion')}</Pill>}
          </div>

          {saveError && <Alert variant={saveError.status === 403 ? 'warning' : 'error'} title={t('modelodetallemodal.operacion_rechazada')} description={saveError.message} />}

          {/* Métricas de validación */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('modelodetallemodal.metricas_de_validacion')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 'var(--s3)' }}>
              <Metrica label={t('modelodetallemodal.f1_global')} valor={pct(modelo.f1_score)} destacado />
              <Metrica label={t('modelodetallemodal.recall_riesgo_alto')} valor={pct(modelo.recall_clase_riesgo_alto)} destacado />
              <Metrica label={t('modelodetallemodal.precision')} valor={pct(modelo.precision_modelo)} />
              <Metrica label={t('modelodetallemodal.accuracy')} valor={pct(modelo.accuracy)} />
              <Metrica label={t('modelodetallemodal.roc_auc')} valor={pct(modelo.roc_auc_score)} />
            </div>
          </div>

          {modelo.matriz_confusion && modelo.matriz_confusion.length > 0 && (
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s3)' }}>{t('modelodetallemodal.matriz_de_confusion')}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <tbody>
                    {modelo.matriz_confusion.map((fila, i) => (
                      <tr key={i}>
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

          {/* Metadatos técnicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)', fontSize: '12px', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Formato: </span>{modelo.formato_artefacto ?? '—'}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>{t('modelodetallemodal.tamano')}</span>{modelo.tamanio_artefacto_bytes ? `${(modelo.tamanio_artefacto_bytes / 1_048_576).toFixed(1)} MB` : '—'}</div>
            <div style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans, inherit)' }}>{t('modelodetallemodal.hash_sha_256')}</span>{modelo.hash_artefacto_sha256 ?? '—'}
            </div>
          </div>

          {/* Notas de validación clínica */}
          <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s2)' }}>{t('modelodetallemodal.notas_de_validacion_clinica')}</h3>
            {puedeEditar ? (
              <>
                <textarea
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
                {modelo.notas_validacion || 'Sin notas registradas.'}
              </p>
            )}
          </div>

          {/* Acción de activación */}
          {modelo.estado_version === 'APROBADO' && puedeEjecutar && (
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
              {!tieneNotas && (
                <Alert variant="info" title={t('modelodetallemodal.notas_requeridas')} description={t('modelodetallemodal.registra_las_notas_de_validacion_clinica')} style={{ marginBottom: 'var(--s3)' }} />
              )}
              <Button variant="primary" disabled={!puedeActivar} onClick={onSolicitarActivar}>
                <Rocket size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('modelodetallemodal.activar_en_produccion')}</Button>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
