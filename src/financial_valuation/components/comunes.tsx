// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: piezas comunes de las vistas del módulo financiero |
import React, { useEffect } from 'react';
import { Badge } from '../../shared/design-system/Badge';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { useAsync } from '../../supplies/hooks/useAsync';
import { formatoFecha } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import type { Periodo } from '../types';

export { EncabezadoVista } from '../../supplies/components/EncabezadoVista';
export { EstadoVacio } from '../../supplies/components/EstadoVacio';
export { MotivoModal } from '../../supplies/components/MotivoModal';
export { AreaTexto } from '../../supplies/components/AreaTexto';
export { Paginacion } from '../../supplies/components/Paginacion';
export { useAsync } from '../../supplies/hooks/useAsync';
export { formatoCantidad, formatoFecha, formatoMoneda } from '../../supplies/lib/formato';
export { guardarArchivo } from '../../supplies/lib/descarga';
export { PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM, FILTROS } from '../../supplies/components/estilos';

/** Estados del dominio → color del badge. El texto se traduce; el valor no. */
const VARIANTE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  ACTIVO: 'success', VIGENTE: 'success', REGISTRADO: 'success', REGISTRADA: 'success', CERRADO: 'success',
  APROBADO: 'success', VERIFICADO: 'success', CONFIRMADO: 'success', ACEPTADO: 'success', CALCULADO: 'success',
  PROGRAMADO: 'info', GENERADO: 'info', BORRADOR: 'info', COTIZADO: 'info', ABIERTO: 'info',
  PENDIENTE_CUENTA: 'warning', PENDIENTE_CLASIFICACION: 'warning', VERIFICACION_PENDIENTE: 'warning', EN_CIERRE: 'warning',
  ESTIMADO: 'warning', VENCIDO: 'warning', VENCIDA: 'warning', INCOMPLETO: 'warning', CONVERTIDA_EN_VENTA: 'success',
  RECHAZADO: 'error', ANULADO: 'error', ANULADA: 'error', FALLIDO: 'error', REVERTIDO: 'neutral', REVERTIDA: 'neutral',
  SUPERADO: 'neutral', ARCHIVADO: 'neutral', EXCLUIDA: 'neutral',
};

export function EstadoBadge({ estado }: { estado: string | null | undefined }) {
  const { t } = useT('finanzas');
  if (!estado) return <>—</>;
  return <Badge variant={VARIANTE[estado] ?? 'neutral'}>{t(`estado.${estado}`, { defaultValue: estado })}</Badge>;
}

export function ErrorApi({ error }: { error: ApiError | null }) {
  return error ? <Alert variant="error" title={error.message} style={{ marginBottom: 'var(--s4)' }} /> : null;
}

/** "0.0500" → "5"; las fracciones del backend se editan como porcentaje. */
export function aPorcentaje(fraccion: string | null | undefined): string {
  if (fraccion == null || fraccion === '') return '';
  return String(Number((Number(fraccion) * 100).toFixed(4)));
}

/** "5" → "0.05"; texto inválido o fuera de 0-100 → null. */
export function aFraccion(porcentaje: string): string | null {
  const v = Number(porcentaje.trim().replace(',', '.'));
  if (porcentaje.trim() === '' || !Number.isFinite(v) || v < 0 || v > 100) return null;
  return String(Number((v / 100).toFixed(6)));
}

export function etiquetaPeriodo(p: Periodo): string {
  return `${p.numero_id_tributaria} · ${formatoFecha(p.fecha_inicio)} – ${formatoFecha(p.fecha_fin)}`;
}

interface SelectorPeriodoProps {
  id: string;
  value: number | null;
  onChange: (id: number | null, periodo: Periodo | null) => void;
  /** Elige un período al cargar: el más reciente con el estado preferido (abierto, por defecto). */
  autoseleccionar?: boolean;
  preferir?: 'ABIERTO' | 'CERRADO';
}

export function SelectorPeriodo({ id, value, onChange, autoseleccionar, preferir = 'ABIERTO' }: SelectorPeriodoProps) {
  const { t } = useT('finanzas');
  const { data, cargando, error, ejecutar } = useAsync(finanzasApi.periodos);
  useEffect(() => { ejecutar(); }, [ejecutar]);
  const periodos = data ?? [];
  useEffect(() => {
    if (autoseleccionar && value === null && periodos.length > 0) {
      const elegido = periodos.find((p) => p.estado === preferir) ?? periodos[0];
      onChange(elegido.id_periodo_contable, elegido);
    }
  }, [autoseleccionar, preferir, value, periodos, onChange]);
  return (
    <Select
      id={id}
      label={t('comun.periodo')}
      value={value ?? ''}
      disabled={cargando}
      error={error?.message}
      hint={!cargando && periodos.length === 0 ? t('comun.sin_periodos') : undefined}
      onChange={(e) => {
        const p = periodos.find((x) => x.id_periodo_contable === Number(e.target.value)) ?? null;
        onChange(p?.id_periodo_contable ?? null, p);
      }}
    >
      <option value="">{cargando ? t('comun.cargando') : t('comun.elegir_periodo')}</option>
      {periodos.map((p) => (
        <option key={p.id_periodo_contable} value={p.id_periodo_contable}>
          {etiquetaPeriodo(p)} · {t(`estado.${p.estado}`, { defaultValue: p.estado })}
        </option>
      ))}
    </Select>
  );
}

/** Lista de definición compacta para los detalles numéricos. */
export function Datos({ filas }: { filas: Array<[string, React.ReactNode]> }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--s3) var(--s5)', margin: 0 }}>
      {filas.map(([k, v]) => (
        <div key={k} style={{ minWidth: 0 }}>
          <dt style={{ fontSize: 'var(--fs-label-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>{k}</dt>
          <dd style={{ margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-md)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Subtitulo({ children, id }: { children: React.ReactNode; id?: string }) {
  return <h2 id={id} style={{ margin: 'var(--s6) 0 var(--s3)', fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{children}</h2>;
}
