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

const HEADERS = [
  { clave: 'auditoriatable.col_num', id: 'num' },
  { clave: 'auditoriatable.col_usuario', id: 'usuario' },
  { clave: 'auditoriatable.col_tipo_evento', id: 'tipo-evento' },
  { clave: 'auditoriatable.col_modulo', id: 'modulo' },
  { clave: 'auditoriatable.col_descripcion', id: 'descripcion' },
  { clave: 'auditoriatable.col_resultado', id: 'resultado' },
  { clave: 'auditoriatable.col_ip', id: 'ip' },
  { clave: 'auditoriatable.col_fecha_hora', id: 'fecha-hora' },
  { clave: 'auditoriatable.col_integridad', id: 'integridad' },
  { clave: 'auditoriatable.col_accion', id: 'accion' },
] as const;

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
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--s7) 0' }}>{t('auditoriatable.no_se_encontraron_eventos_con_los_filtros')}</p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            {HEADERS.map(({ clave, id }) => (
              <th
                key={id}
                scope="col"
                id={`th-${id}`}
                style={{
                  padding: 'var(--s2) var(--s4)',
                  textAlign: 'left',
                  fontSize: 'var(--fs-label-sm)',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(clave)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id_evento} style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <td headers="th-num" style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)' }}>
                {e.id_evento}
              </td>
              <td headers="th-usuario" style={{ padding: 'var(--s3) var(--s4)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {e.nombre_usuario ?? <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)' }}>ID {e.id_usuario}</span>}
              </td>
              <td headers="th-tipo-evento" style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Badge variant={tipoBadge(e.tipo_evento, tiposEvento)}>
                  {tipoLabel(e.tipo_evento, tiposEvento)}
                </Badge>
              </td>
              <td headers="th-modulo" style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)' }}>
                {e.modulo}
              </td>
              <td
                headers="th-descripcion"
                style={{ padding: 'var(--s3) var(--s4)', color: 'var(--text-secondary)', maxWidth: 220 }}
                title={e.descripcion}
              >
                {truncar(e.descripcion, 55)}
              </td>
              <td headers="th-resultado" style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Badge variant={e.resultado === 'EXITOSO' || e.resultado === 'EXITO' ? 'activo' : 'eliminado'}>
                  {e.resultado}
                </Badge>
              </td>
              <td headers="th-ip" style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)' }}>
                {e.direccion_ip ?? '—'}
              </td>
              <td headers="th-fecha-hora" style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {formatFecha(e.fecha_evento)}
              </td>
              <td headers="th-integridad" style={{ padding: 'var(--s3) var(--s4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-label-sm)', color: 'var(--text-secondary)' }}>
                {e.integridad}
              </td>
              <td headers="th-accion" style={{ padding: 'var(--s3) var(--s4)', whiteSpace: 'nowrap' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVerificar(e)}
                  aria-label={t('auditoriatable.verificar_integridad_del_evento', { id: e.id_evento })}
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
