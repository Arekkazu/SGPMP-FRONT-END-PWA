// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-73: columna de RF de origen |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: nombre del usuario en vez de «Usuario 900» |
import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye, User, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { SeveridadAuditoriaPill } from './SeveridadAuditoriaPill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import { rfDeEvento } from '../lib/rfOrigen';
import type { EventoAuditoriaM04Response } from '../types';

function fmt(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFechaHora(d);
}

interface Props {
  eventos: EventoAuditoriaM04Response[];
  loading: boolean;
  onVer: (e: EventoAuditoriaM04Response) => void;
}

export function AuditoriaTable({ eventos, loading, onVer }: Props) {
  const { t } = useT('prediction');
  if (loading) {
    return <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('auditoriatable.cargando_bitacora')}</div>;
  }
  if (eventos.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('auditoriatable.no_hay_eventos_que_coincidan_con_los_filtros')}</div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de eventos de auditoría">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th style={TH}>{t('auditoriatable.timestamp')}</th>
            <th style={TH}>{t('auditoriatable.tipo_de_evento')}</th>
            <th style={TH}>{t('auditoriatable.rf_origen')}</th>
            <th style={TH}>{t('auditoriatable.severidad')}</th>
            <th style={TH}>{t('auditoriatable.resultado')}</th>
            <th style={TH}>{t('auditoriatable.actor')}</th>
            <th style={TH}>{t('auditoriatable.version')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('auditoriatable.latencia')}</th>
            <th style={{ ...TH, textAlign: 'right' }}>{t('auditoriatable.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => {
            const ok = (e.resultado_operacion ?? '').toUpperCase().includes('EXITO') || (e.resultado_operacion ?? '').toUpperCase() === 'OK';
            return (
              <tr key={e.id_evento}>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(e.fecha_evento)}</td>
                <td style={{ ...TD, fontWeight: 600, color: 'var(--text-primary)' }}>{e.tipo_evento}</td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{rfDeEvento(e.tipo_evento) ?? '—'}</td>
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
                    {e.tipo_actor === 'SISTEMA' ? (e.id_sistema ?? 'Sistema') : (e.nombre_usuario ?? (e.id_usuario != null ? `Usuario ${e.id_usuario}` : 'Usuario'))}
                  </span>
                </td>
                <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.version_modelo ?? '—'}</td>
                <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{e.latencia_ms != null ? `${e.latencia_ms} ms` : '—'}</td>
                <td style={{ ...TD, textAlign: 'right' }}>
                  <Button variant="ghost" size="sm" onClick={() => onVer(e)} aria-label={t('auditoriatable.ver_evento')} title={t('auditoriatable.ver_detalle')}>
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
