import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { TIPOS_EVENTO } from './AuditoriaFiltros';
import type { AuditoriaItemResponse } from '../types';

interface Props {
  eventos: AuditoriaItemResponse[];
  loading: boolean;
  onVerificar: (evento: AuditoriaItemResponse) => void;
}

// Color por tipo de evento, siguiendo el catálogo de TIPOS_EVENTO.
const EVENT_BADGE: Record<number, 'activo' | 'eliminado' | 'inactivo' | 'pendiente'> = {
  1: 'pendiente', 2: 'activo', 3: 'activo', 4: 'eliminado',
  5: 'inactivo', 6: 'pendiente', 7: 'pendiente', 8: 'pendiente',
  9: 'pendiente', 10: 'pendiente', 11: 'pendiente', 12: 'pendiente',
  13: 'eliminado', 14: 'pendiente', 15: 'eliminado', 16: 'inactivo',
  17: 'inactivo', 18: 'inactivo', 19: 'inactivo', 20: 'activo',
  21: 'pendiente', 22: 'pendiente', 23: 'inactivo', 24: 'eliminado',
  25: 'eliminado',
};

function tipoLabel(tipo: number): string {
  return TIPOS_EVENTO.find((t) => t.id === tipo)?.label ?? String(tipo);
}

function truncar(texto: string | undefined, max: number): string {
  if (!texto) return '—';
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}

function formatFecha(fecha: string): string {
  try {
    return new Date(fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return fecha;
  }
}

const HEADERS = ['#', 'Usuario', 'Tipo evento', 'Módulo', 'Descripción', 'Resultado', 'IP', 'Fecha/Hora', 'Integridad', 'Acción'];

export function AuditoriaTable({ eventos, loading, onVerificar }: Props) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0' }}>
        No se encontraron eventos con los filtros aplicados.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {HEADERS.map((h) => (
              <th
                key={h}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  textAlign: 'left',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id_evento} style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {e.id_evento}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {e.nombre_usuario ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>ID {e.id_usuario}</span>}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Badge variant={EVENT_BADGE[e.tipo_evento] ?? 'inactivo'}>
                  {tipoLabel(e.tipo_evento)}
                </Badge>
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)' }}>
                {e.modulo}
              </td>
              <td
                style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', maxWidth: 220 }}
                title={e.descripcion}
              >
                {truncar(e.descripcion, 55)}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Badge variant={e.resultado === 'EXITOSO' || e.resultado === 'EXITO' ? 'activo' : 'eliminado'}>
                  {e.resultado}
                </Badge>
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {e.direccion_ip ?? '—'}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {formatFecha(e.fecha_evento)}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {e.integridad}
              </td>
              <td style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVerificar(e)}
                  aria-label={`Verificar integridad del evento ${e.id_evento}`}
                >
                  <ShieldCheck size={14} aria-hidden style={{ marginRight: 4 }} />
                  Verificar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
