import React from 'react';
import { Eye, User, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { SeveridadAuditoriaPill } from './SeveridadAuditoriaPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { EventoAuditoriaM04Response } from '../types';

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString('es-CO');
}

interface Props {
  eventos: EventoAuditoriaM04Response[];
  loading: boolean;
  onVer: (e: EventoAuditoriaM04Response) => void;
}

export function AuditoriaTable({ eventos, loading, onVer }: Props) {
  if (loading) {
    return <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Cargando bitácora…</div>;
  }
  if (eventos.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>
        No hay eventos que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div style={TABLE_WRAP}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>Timestamp</th>
            <th style={TH}>Tipo de evento</th>
            <th style={TH}>Severidad</th>
            <th style={TH}>Resultado</th>
            <th style={TH}>Actor</th>
            <th style={TH}>Versión</th>
            <th style={{ ...TH, textAlign: 'right' }}>Latencia</th>
            <th style={{ ...TH, textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => {
            const ok = (e.resultado_operacion ?? '').toUpperCase().includes('EXITO') || (e.resultado_operacion ?? '').toUpperCase() === 'OK';
            return (
              <tr key={e.id_evento}>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(e.fecha_evento)}</td>
                <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{e.tipo_evento}</td>
                <td style={TD}><SeveridadAuditoriaPill severidad={e.severidad_evento} /></td>
                <td style={TD}>
                  {e.resultado_operacion ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', color: ok ? 'var(--sem-success)' : 'var(--sem-error)' }}>
                      {ok ? <CheckCircle2 size={14} aria-hidden /> : <XCircle size={14} aria-hidden />}
                      {e.resultado_operacion}
                    </span>
                  ) : '—'}
                </td>
                <td style={TD}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', color: 'var(--text-secondary)' }}>
                    {e.tipo_actor === 'SISTEMA' ? <Cpu size={14} aria-hidden /> : <User size={14} aria-hidden />}
                    {e.tipo_actor === 'SISTEMA' ? (e.id_sistema ?? 'Sistema') : (e.id_usuario != null ? `Usuario ${e.id_usuario}` : 'Usuario')}
                  </span>
                </td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.version_modelo ?? '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.latencia_ms != null ? `${e.latencia_ms} ms` : '—'}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" onClick={() => onVer(e)} aria-label="Ver evento" title="Ver detalle">
                    <Eye size={16} aria-hidden />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
