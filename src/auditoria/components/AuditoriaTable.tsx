import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import type { AuditoriaItemResponse, TipoEvento } from '../types';

interface Props {
  eventos: AuditoriaItemResponse[];
  loading: boolean;
  onVerificar: (evento: AuditoriaItemResponse) => void;
  tiposEvento: TipoEvento[];
}

// El color sale de la categoría funcional (3 valores) en vez de un mapa de 25
// ids quemados: el catálogo del backend ya la trae por tipo.
const BADGE_POR_CATEGORIA: Record<string, 'activo' | 'eliminado' | 'inactivo' | 'pendiente'> = {
  AUTENTICACION: 'activo',
  MODIFICACION: 'pendiente',
  CONSULTA: 'inactivo',
};


/** Etiqueta del catálogo; cae al id si aún no cargó o el tipo es desconocido. */
function tipoLabel(tipo: number, catalogo: TipoEvento[]): string {
  return catalogo.find((t) => t.id_tipo_evento === tipo)?.nombre ?? String(tipo);
}

function tipoBadge(tipo: number, catalogo: TipoEvento[]) {
  const categoria = catalogo.find((t) => t.id_tipo_evento === tipo)?.categoria;
  return (categoria && BADGE_POR_CATEGORIA[categoria]) ?? 'inactivo';
}

function truncar(texto: string | undefined, max: number): string {
  if (!texto) return '—';
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}

function formatFecha(fecha: string): string {
  try {
    return formatearFechaHora(fecha, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return fecha;
  }
}

const HEADERS = ['#', 'Usuario', 'Tipo evento', 'Módulo', 'Descripción', 'Resultado', 'IP', 'Fecha/Hora', 'Integridad', 'Acción'];

export function AuditoriaTable({ eventos, loading, onVerificar, tiposEvento }: Props) {
  const { t } = useT('auditoria');
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
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0' }}>{t('auditoriatable.no_se_encontraron_eventos_con_los_filtros')}</p>
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
                <Badge variant={tipoBadge(e.tipo_evento, tiposEvento)}>
                  {tipoLabel(e.tipo_evento, tiposEvento)}
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
                  <ShieldCheck size={14} aria-hidden style={{ marginRight: 4 }} />{t('auditoriatable.verificar')}</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
