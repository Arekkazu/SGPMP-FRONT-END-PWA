import React, { useState, useEffect } from 'react';
import { formatearFecha } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { X, Check } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { useEspecies } from '../hooks/useEspecies';
import type { PlantillaResponse, AplicacionPlantillaResponse, EspecieResponse } from '../types';
import type { ApiError } from '../../shared/api/errors';

// ── Stepper ───────────────────────────────────────────────────────────────────
const STEPS = ['Seleccionar especie', 'Previsualizar', 'Aplicar', 'Resultado'] as const;

function Stepper({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s6)', flexWrap: 'wrap' }}>
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div style={{ height: 2, width: 20, background: done ? 'var(--brand-400)' : 'var(--surface-border)', flexShrink: 0 }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                background: done ? 'var(--brand-500)' : active ? 'var(--brand-100)' : 'var(--surface-hover)',
                color: done ? '#fff' : active ? 'var(--brand-700)' : 'var(--text-muted)',
                border: active ? '2px solid var(--brand-400)' : done ? 'none' : '2px solid var(--surface-border)',
              }}>
                {done ? <Check size={12} /> : idx + 1}
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: done ? 'var(--brand-600)' : active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── JSON viewer ───────────────────────────────────────────────────────────────
function JsonViewer({ data, label }: { data: Record<string, unknown>; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--s2)' }}>
        {label}
      </div>
      <div style={{
        background: '#1a1e18', borderRadius: 'var(--r-lg)', padding: 'var(--s4)',
        fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#a8e6b0',
        maxHeight: 180, overflowY: 'auto',
      }}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            <span style={{ color: '#70a8e0' }}>"{k}"</span>
            <span style={{ color: '#e0c870' }}>: {JSON.stringify(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Diff table ────────────────────────────────────────────────────────────────
function DiffTable({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const { t } = useT('configuration');
  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));

  if (allKeys.length === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('aplicarplantillawizard.sin_diferencias_registradas')}</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            {['Parámetro', 'Antes', 'Después'].map((h) => (
              <th key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', padding: '8px 14px', textAlign: 'left', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allKeys.map((k) => {
            const b = before?.[k];
            const a = after?.[k];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            return (
              <tr key={k} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{k}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: changed ? 'var(--sem-error)' : 'var(--text-muted)', textDecoration: changed ? 'line-through' : 'none' }}>
                  {b !== undefined ? JSON.stringify(b) : '—'}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: changed ? 'var(--sem-success)' : 'var(--text-muted)', fontWeight: changed ? 700 : 400 }}>
                  {a !== undefined ? JSON.stringify(a) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────
interface Props {
  plantilla: PlantillaResponse;
  saving: boolean;
  saveError: ApiError | null;
  onClose: () => void;
  onAplicar: (idEspecieDestino: number, fechaActualizacion: string | null) => Promise<AplicacionPlantillaResponse | null>;
}

export function AplicarPlantillaWizard({ plantilla, saving, saveError, onClose, onAplicar }: Props) {
  const { t } = useT('configuration');
  const { especies, cargar } = useEspecies();
  useEffect(() => { cargar(); }, [cargar]);
  const activas = especies.filter((e) => e.es_activo);

  const [step, setStep] = useState(0);
  const [targetEspecie, setTargetEspecie] = useState<EspecieResponse | null>(null);
  const [resultado, setResultado] = useState<AplicacionPlantillaResponse | null>(null);

  const handleAplicar = async () => {
    if (!targetEspecie) return;
    const res = await onAplicar(targetEspecie.id_especie, targetEspecie.fecha_actualizacion);
    if (res) {
      setResultado(res);
      setStep(3);
    }
  };

  const especieOrigen = especies.find((e) => e.id_especie === plantilla.id_especie);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', padding: 'var(--s4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && step !== 2) onClose(); }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--r-xl)',
        border: '1px solid var(--surface-border)', width: '100%', maxWidth: 600,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 1,
          padding: 'var(--s5) var(--s6)', borderBottom: '1px solid var(--surface-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 id="wizard-modal-title" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('aplicarplantillawizard.aplicar_plantilla')}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{plantilla.template_name}</p>
          </div>
          {step !== 2 && (
            <button type="button" onClick={onClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: 'var(--r-full)', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} aria-label={t('aplicarplantillawizard.cerrar')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--s6)' }}>
          <Stepper current={step} />

          {saveError && (
            <Alert variant="error" title={t('aplicarplantillawizard.error_al_aplicar')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
          )}

          {/* Step 0: Seleccionar especie */}
          {step === 0 && (
            <div>
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s1)' }}>{t('aplicarplantillawizard.especie_origen')}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', padding: 'var(--s3) var(--s4)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', border: '1px solid var(--surface-border)' }}>
                  {especieOrigen?.nombre ?? `ID ${plantilla.id_especie}`}
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s3)' }}>{t('aplicarplantillawizard.selecciona_la_especie_destino')}<span aria-hidden>*</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--s3)' }}>
                {activas.map((e) => {
                  const selected = targetEspecie?.id_especie === e.id_especie;
                  return (
                    <button
                      key={e.id_especie}
                      type="button"
                      onClick={() => setTargetEspecie(e)}
                      style={{
                        padding: 'var(--s3) var(--s4)',
                        background: selected ? 'var(--surface-hover)' : 'var(--surface-card)',
                        border: `2px solid ${selected ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                        borderRadius: 'var(--r-lg)', cursor: 'pointer', textAlign: 'left',
                        transition: 'border-color 0.15s',
                        position: 'relative',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{e.nombre}</div>
                      {selected && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={10} color="#fff" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Previsualizar */}
          {step === 1 && targetEspecie && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
              <Alert
                variant="info"
                title={t('aplicarplantillawizard.previsualizacion')}
                description={`Se aplicará la plantilla "${plantilla.template_name}" a la especie "${targetEspecie.nombre}". Los parámetros incluidos se muestran a continuación.`}
              />
              <JsonViewer data={plantilla.params_snapshot} label={t('aplicarplantillawizard.parametros_de_la_plantilla')} />
              <div style={{ padding: 'var(--s4)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', border: '1px solid var(--surface-border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s1)' }}>{t('aplicarplantillawizard.especie_destino')}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{targetEspecie.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  ID {targetEspecie.id_especie} · Creada {formatearFecha(targetEspecie.fecha_creacion)}
                </div>
              </div>
              <Alert
                variant="warning"
                title={t('aplicarplantillawizard.esta_accion_es_irreversible')}
                description={t('aplicarplantillawizard.confirma_que_deseas_aplicar_estos')}
              />
            </div>
          )}

          {/* Step 2: Aplicando */}
          {step === 2 && (
            <div style={{ textAlign: 'center', padding: 'var(--s7) 0' }}>
              <div style={{ fontSize: '32px', marginBottom: 'var(--s4)' }}>⚙️</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s2)' }}>{t('aplicarplantillawizard.aplicando_plantilla')}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('aplicarplantillawizard.esto_puede_tomar_unos_segundos')}</div>
            </div>
          )}

          {/* Step 3: Resultado */}
          {step === 3 && resultado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
              <Alert variant="success" title={t('aplicarplantillawizard.plantilla_aplicada_correctamente')} description={t('aplicarplantillawizard.los_parametros_de_configuracion_han_sido')} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s3)' }}>{t('aplicarplantillawizard.diferencias_registradas')}</div>
                <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                  <DiffTable before={resultado.before_snapshot ?? {}} after={resultado.after_snapshot ?? {}} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 'var(--s4) var(--s6)', borderTop: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)' }}>
          <div>
            {step === 0 && (
              <Button variant="secondary" size="md" onClick={onClose}>{t('aplicarplantillawizard.cancelar')}</Button>
            )}
            {step === 1 && (
              <Button variant="secondary" size="md" onClick={() => setStep(0)}>{t('aplicarplantillawizard.atras')}</Button>
            )}
            {step === 3 && (
              <Button variant="secondary" size="md" onClick={onClose}>{t('aplicarplantillawizard.cerrar')}</Button>
            )}
          </div>
          <div>
            {step === 0 && (
              <Button variant="primary" size="md" disabled={!targetEspecie} onClick={() => setStep(1)}>{t('aplicarplantillawizard.siguiente')}</Button>
            )}
            {step === 1 && (
              <Button variant="danger" size="md" loading={saving} onClick={() => { setStep(2); handleAplicar(); }}>{t('aplicarplantillawizard.aplicar_plantilla_2')}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
