// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-104: tabla de la vista previa con montos, fechas y porcentajes formateados |
import React from 'react';
import { formatearFechaHora, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import type { TablaPrevia, TipoColumna } from '../tipos';

/** Una fecha `AAAA-MM-DD` es un día calendario: se muestra tal cual, sin convertir de zona. */
function fechaDia(valor: string): string {
  const [a, m, d] = valor.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function celda(valor: string | number | null, tipo: TipoColumna, sinDato: string): string {
  if (valor === null || valor === undefined || valor === '') return sinDato;
  if (typeof valor === 'string' && !/^-?\d/.test(valor)) return valor;
  switch (tipo) {
    case 'MONEDA': return typeof valor === 'number' ? `$ ${formatearNumero(valor, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : valor;
    case 'NUMERO': return typeof valor === 'number' ? formatearNumero(valor, { maximumFractionDigits: 2 }) : valor;
    case 'ENTERO': return typeof valor === 'number' ? formatearNumero(valor, { maximumFractionDigits: 0 }) : valor;
    case 'PORCENTAJE': return typeof valor === 'number' ? `${formatearNumero(valor, { maximumFractionDigits: 2 })} %` : valor;
    case 'FECHA': return typeof valor === 'string' ? fechaDia(valor) : String(valor);
    case 'FECHA_HORA': return typeof valor === 'string' && valor.length > 10 ? formatearFechaHora(valor)
      : typeof valor === 'string' ? fechaDia(valor) : String(valor);
    default: return String(valor);
  }
}

const NUMERICAS: TipoColumna[] = ['MONEDA', 'NUMERO', 'ENTERO', 'PORCENTAJE'];
const TH: React.CSSProperties = { padding: 'var(--s2) var(--s3)', borderBottom: '2px solid var(--surface-border)',
  color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: 'var(--s2) var(--s3)', borderBottom: '1px solid var(--surface-border)',
  verticalAlign: 'top' };

export function TablaReporte({ tabla }: { tabla: TablaPrevia }) {
  const { t } = useT('reportes');
  return (
    <section style={{ marginBottom: 'var(--s5)' }}>
      <h4 style={{ margin: '0 0 var(--s2)', fontSize: 'var(--fs-body-md)' }}>{tabla.titulo}</h4>
      {tabla.filas.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{t('previa.tabla_vacia')}</p>
      ) : (
        <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={tabla.titulo} style={{ overflowX: 'auto' }}>
          <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-body-md)' }}>
            <thead>
              <tr>{tabla.columnas.map((c) => (
                <th key={c.clave} scope="col" style={{ ...TH, textAlign: NUMERICAS.includes(c.tipo) ? 'right' : 'left' }}>{c.titulo}</th>
              ))}</tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, i) => (
                <tr key={i}>{tabla.columnas.map((c) => (
                  <td key={c.clave} data-label={c.titulo} style={{ ...TD, textAlign: NUMERICAS.includes(c.tipo) ? 'right' : 'left' }}>
                    {celda(fila[c.clave], c.tipo, t('previa.sin_dato'))}
                  </td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tabla.total_filas > tabla.filas.length && (
        <p style={{ margin: 'var(--s2) 0 0', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' }}>
          {t('previa.mostrando', { mostradas: tabla.filas.length, total: tabla.total_filas })}
        </p>
      )}
      {tabla.nota && <p style={{ margin: 'var(--s2) 0 0' }}>{tabla.nota}</p>}
    </section>
  );
}
