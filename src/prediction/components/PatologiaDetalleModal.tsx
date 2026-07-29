import React from 'react';
import { Button } from '../../shared/design-system/Button';
import { ModalShell } from './ModalShell';
import { EstadoActivoPill, TipoPatologiaPill } from './PatologiaPills';
import { nombreEspecie, nombreVariable } from '../lib/catalogos';
import type { PatologiaM04Response } from '../types';

interface Props {
  patologia: PatologiaM04Response | null;
  loading: boolean;
  onClose: () => void;
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{children}</span>
    </div>
  );
}

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

export function PatologiaDetalleModal({ patologia, loading, onClose }: Props) {
  return (
    <ModalShell
      title={patologia?.nombre_patologia ?? 'Detalle de patología'}
      onClose={onClose}
      maxWidth={640}
      footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
    >
      {loading || !patologia ? (
        <div style={{ padding: 'var(--s6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Cargando…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <TipoPatologiaPill esBase={patologia.es_base} />
            <EstadoActivoPill activo={patologia.es_activo} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)' }}>
            <Fila label="Especie aplicable">{nombreEspecie(patologia.especie_aplicable)}</Fila>
            <Fila label="Versión de catálogo">v{patologia.version_catalogo}</Fila>
            <Fila label="ID">{patologia.id_patologia}</Fila>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descripción clínica</span>
            <p style={{ margin: 'var(--s1) 0 0', fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {patologia.descripcion_clinica || '—'}
            </p>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Variables sensóricas asociadas</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
              {patologia.variables_sensoricas_asociadas.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>}
              {patologia.variables_sensoricas_asociadas.map((v) => (
                <span
                  key={v.id_variable_ambiental}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)',
                    fontSize: '12px', padding: '2px var(--s2)', borderRadius: 'var(--r-sm)',
                    background: 'var(--surface-hover)',
                    border: `1px solid ${v.es_variable_critica ? 'var(--sem-warning-border)' : 'var(--surface-border)'}`,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {nombreVariable(v.id_variable_ambiental)}
                  {v.es_variable_critica && <strong style={{ color: 'var(--sem-warning)' }} title="Variable crítica">★</strong>}
                  {v.peso_evidencia != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', opacity: 0.7 }}>{v.peso_evidencia}</span>}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)', borderTop: '1px solid var(--surface-border)', paddingTop: 'var(--s4)' }}>
            <Fila label="Creación">{fmt(patologia.fecha_creacion_m04)}</Fila>
            <Fila label="Última actualización">{fmt(patologia.fecha_actualizacion)}</Fila>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
