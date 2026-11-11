// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-82..94: piezas comunes de las vistas del módulo financiero |
// | 2026-11-05 | Arekkazu | M06 prototipos: período global, indicadores, listado con búsqueda, filtros y pie |
// | 2026-11-10 | Arekkazu | TC-DIS-244..266 RF-87..94: badges con icono, NIT ausente, páginas numeradas, resultado con Ganancia/Pérdida y descarga anunciada |
// | 2026-11-10 | Arekkazu | TC-DIS-262 RF-93: el período lo elige también quien solo consulta reportes (prefiere el último cerrado) |
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Clock, FilterX, Info, Search, SearchX, XCircle } from 'lucide-react';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { useT } from '../../shared/i18n/useT';
import i18n from '../../shared/i18n';
import type { ApiError } from '../../shared/api/errors';
import { normalizar, usePaginado } from '../../shared/hooks/useBusqueda';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useAsync } from '../../supplies/hooks/useAsync';
import { Paginacion } from '../../supplies/components/Paginacion';
import { pushToast } from '../../shared/hooks/useToast';
import { guardarArchivo as guardarBlob } from '../../supplies/lib/descarga';
import type { Archivo } from '../api/finanzasApi';
import { EstadoVacio } from '../../supplies/components/EstadoVacio';
import { formatoFecha, formatoMoneda } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { signo } from '../lib/decimal';
import { ACCION_R, R_CIERRE, R_ESTADO_RESULTADOS, R_REVELACIONES } from '../rbac';
import type { Periodo } from '../types';
import '../finanzas.css';

export { EncabezadoVista } from '../../supplies/components/EncabezadoVista';
export { EstadoVacio } from '../../supplies/components/EstadoVacio';
export { MotivoModal } from '../../supplies/components/MotivoModal';
export { AreaTexto } from '../../supplies/components/AreaTexto';
export { useAsync } from '../../supplies/hooks/useAsync';
export { formatoCantidad, formatoFecha, formatoMoneda } from '../../supplies/lib/formato';
export { guardarArchivo } from '../../supplies/lib/descarga';
export { PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM, FILTROS } from '../../supplies/components/estilos';

export type Tono = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/** Estados del dominio → color del badge. El texto se traduce; el valor no. */
const VARIANTE: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  ACTIVO: 'success', VIGENTE: 'success', REGISTRADO: 'success', REGISTRADA: 'success', CERRADO: 'success',
  APROBADO: 'success', VERIFICADO: 'success', CONFIRMADO: 'success', ACEPTADO: 'success', CALCULADO: 'success',
  COMPLETADO: 'success', CONVERTIDA_EN_VENTA: 'success',
  PROGRAMADO: 'info', GENERADO: 'info', BORRADOR: 'info', COTIZADO: 'info', ABIERTO: 'info',
  PENDIENTE_CUENTA: 'warning', PENDIENTE_CLASIFICACION: 'warning', VERIFICACION_PENDIENTE: 'warning', EN_CIERRE: 'warning',
  ESTIMADO: 'warning', VENCIDO: 'warning', VENCIDA: 'warning', INCOMPLETO: 'warning', MEDICION_PENDIENTE: 'warning',
  REVISION_REQUERIDA: 'warning', PENDIENTE: 'warning', PENDIENTE_TRAZABILIDAD: 'warning',
  RECHAZADO: 'error', ANULADO: 'error', ANULADA: 'error', FALLIDO: 'error', ERROR: 'error', BLOQUEADO: 'error',
  REVERTIDO: 'neutral', REVERTIDA: 'neutral', SUPERADO: 'neutral', ARCHIVADO: 'neutral', EXCLUIDA: 'neutral',
};

/** Icono de cada tono: el color nunca es el único indicador de estado (WCAG 1.4.1). */
const ICONO_TONO: Record<Tono, React.ReactNode> = {
  success: <CheckCircle2 size={12} aria-hidden />,
  warning: <AlertTriangle size={12} aria-hidden />,
  error: <XCircle size={12} aria-hidden />,
  info: <Info size={12} aria-hidden />,
  neutral: <Ban size={12} aria-hidden />,
};
const ICONO_ESTADO: Record<string, React.ReactNode> = {
  PENDIENTE: <Clock size={12} aria-hidden />, PENDIENTE_CUENTA: <Clock size={12} aria-hidden />, PENDIENTE_CLASIFICACION: <Clock size={12} aria-hidden />,
  VERIFICACION_PENDIENTE: <Clock size={12} aria-hidden />, EN_CIERRE: <Clock size={12} aria-hidden />, MEDICION_PENDIENTE: <Clock size={12} aria-hidden />,
  PROGRAMADO: <Clock size={12} aria-hidden />,
};

/** Badge de estado con icono + texto según su tono. */
export function BadgeTono({ tono, icono, children }: { tono: Tono; icono?: React.ReactNode; children: React.ReactNode }) {
  return <Badge variant={tono}>{icono ?? ICONO_TONO[tono]}{children}</Badge>;
}

export function EstadoBadge({ estado }: { estado: string | null | undefined }) {
  const { t } = useT('finanzas');
  if (!estado) return <>{t('comun.sin_estado')}</>;
  return <BadgeTono tono={VARIANTE[estado] ?? 'neutral'} icono={ICONO_ESTADO[estado]}>{t(`estado.${estado}`, { defaultValue: t('comun.sin_estado') })}</BadgeTono>;
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

// --- Período contable de todo el módulo --------------------------------------------------------

/** «Noviembre de 2026» para un mes; rango de fechas para trimestres y años. */
export function nombrePeriodo(p: Periodo): string {
  if (p.tipo_cierre === 'MENSUAL') {
    const mes = new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(`${p.fecha_inicio}T00:00:00`));
    return mes.charAt(0).toUpperCase() + mes.slice(1);
  }
  return `${formatoFecha(p.fecha_inicio)} – ${formatoFecha(p.fecha_fin)}`;
}

/** «NIT 900123456» o, si la finca aún no tiene titular, un texto que lo diga (nunca «NIT null»). */
export function etiquetaNit(nit: string | null | undefined): string {
  return nit ? `NIT ${nit}` : i18n.t('comun.sin_nit', { ns: 'finanzas' });
}

export function etiquetaPeriodo(p: Periodo): string {
  return `${nombrePeriodo(p)} · ${etiquetaNit(p.numero_id_tributaria)}`;
}

/** Entrega el archivo y anuncia que la descarga quedó lista (WCAG 4.1.3). */
export function descargarArchivo(a: Archivo) {
  guardarBlob(a.blob, a.nombre);
  pushToast('success', i18n.t('comun.descarga_lista', { ns: 'finanzas' }), a.nombre);
}

/**
 * Quien opera el cierre empieza en el abierto más reciente; quien solo consulta reportes, en el último cerrado
 * (es el único con estado de resultados y revelaciones aprobados). Si no hay, el más reciente.
 */
function preferido(periodos: Periodo[], soloConsulta: boolean): Periodo {
  const recientes = [...periodos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  return recientes.find((p) => p.estado === (soloConsulta ? 'CERRADO' : 'ABIERTO')) ?? recientes[0];
}

interface ContextoPeriodo {
  periodos: Periodo[];
  periodo: Periodo | null;
  elegir: (id: number) => void;
  recargar: () => void;
  cargando: boolean;
  error: ApiError | null;
  /** El rol puede leer los períodos contables. */
  disponible: boolean;
}

const PeriodoCtx = createContext<ContextoPeriodo>({
  periodos: [], periodo: null, elegir: () => undefined, recargar: () => undefined, cargando: false, error: null, disponible: false,
});

/** Un solo período para todas las vistas: cambiar de pestaña no lo pierde (prototipo: selector de la barra superior). */
export function ProveedorPeriodo({ children }: { children: React.ReactNode }) {
  const leeCierre = usePermissionPorNombre(R_CIERRE, ACCION_R);
  const leeEstado = usePermissionPorNombre(R_ESTADO_RESULTADOS, ACCION_R);
  const leeRevelaciones = usePermissionPorNombre(R_REVELACIONES, ACCION_R);
  // El backend acepta cualquiera de los tres para listar los períodos (RF-93: el Productor consulta lo aprobado).
  const disponible = leeCierre || leeEstado || leeRevelaciones;
  const { data, cargando, error, ejecutar } = useAsync(finanzasApi.periodos);
  const [id, setId] = useState<number | null>(null);
  useEffect(() => { if (disponible) ejecutar(); }, [disponible, ejecutar]);
  const periodos = data ?? [];
  useEffect(() => {
    if (periodos.length > 0 && !periodos.some((p) => p.id_periodo_contable === id)) setId(preferido(periodos, !leeCierre).id_periodo_contable);
  }, [periodos, id, leeCierre]);
  const valor: ContextoPeriodo = {
    periodos, periodo: periodos.find((p) => p.id_periodo_contable === id) ?? null, elegir: setId,
    recargar: () => { ejecutar(); }, cargando, error, disponible,
  };
  return <PeriodoCtx.Provider value={valor}>{children}</PeriodoCtx.Provider>;
}

export const usePeriodo = () => useContext(PeriodoCtx);

export function BarraPeriodo() {
  const { t } = useT('finanzas');
  const { periodos, periodo, elegir, cargando, error, disponible } = usePeriodo();
  if (!disponible) return null;
  const recientes = [...periodos].sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
  return (
    <div className="fin-periodo">
      <div className="fin-periodo__campo">
        <Select id="fin-periodo" label={t('comun.periodo')} value={periodo?.id_periodo_contable ?? ''} disabled={cargando || periodos.length === 0}
          error={error?.message} onChange={(e) => elegir(Number(e.target.value))}>
          {periodos.length === 0 && <option value="">{cargando ? t('comun.cargando') : t('comun.sin_periodos_corto')}</option>}
          {recientes.map((p) => (
            <option key={p.id_periodo_contable} value={p.id_periodo_contable}>
              {etiquetaPeriodo(p)} · {t(`estado.${p.estado}`, { defaultValue: t('comun.sin_estado') })}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/** Vistas que dependen del período: aviso claro cuando no hay uno elegido o el rol no puede verlos. */
export function SinPeriodo() {
  const { t } = useT('finanzas');
  const { disponible, cargando } = usePeriodo();
  return (
    <EstadoVacio icono={<SearchX size={28} aria-hidden />} titulo={cargando ? t('comun.cargando') : t('comun.sin_periodo_titulo')}
      detalle={disponible ? t('comun.sin_periodos') : t('comun.sin_acceso_periodos')} />
  );
}

// --- Indicadores -----------------------------------------------------------------------------

export interface Indicador { etiqueta: string; valor: React.ReactNode; detalle?: string; tono?: Tono }

export function Indicadores({ items }: { items: Indicador[] }) {
  return (
    <dl className="fin-kpis">
      {items.map((i) => (
        <div key={i.etiqueta} className={`fin-kpi fin-kpi--${i.tono ?? 'neutral'}`}>
          <dt className="fin-kpi__etiqueta">{i.etiqueta}</dt>
          <dd className="fin-kpi__valor">{i.valor}</dd>
          {i.detalle && <dd className="fin-kpi__detalle">{i.detalle}</dd>}
        </div>
      ))}
    </dl>
  );
}

/**
 * Monto con signo explícito: el color acompaña al «+» o «−», nunca lo reemplaza. Con `etiqueta`
 * añade «Ganancia» / «Pérdida» en texto (resultado neto, WCAG 1.4.1).
 */
export function Variacion({ valor, etiqueta }: { valor: string | null | undefined; etiqueta?: boolean }) {
  const { t } = useT('finanzas');
  if (valor == null || valor === '') return <>—</>;
  const s = signo(valor);
  const texto = `${s > 0 ? '+' : ''}${formatoMoneda(valor)}`;
  return (
    <span className={s > 0 ? 'fin-pos' : s < 0 ? 'fin-neg' : undefined}>
      {texto}
      {etiqueta && s !== 0 && ` (${t(s > 0 ? 'comun.ganancia' : 'comun.perdida')})`}
      {etiqueta && s === 0 && ` (${t('comun.sin_resultado')})`}
    </span>
  );
}

// --- Listado: búsqueda, filtros combinados con AND, conteo y paginación -------------------------

export interface Criterio<T> {
  id: string;
  etiqueta: string;
  /** Valor del registro para este filtro; vacío = el registro no entra cuando el filtro está activo. */
  valor: (x: T) => string | null | undefined;
  /** Rótulo de cada opción. Las opciones salen de los datos: ningún filtro ofrece algo que no existe. */
  texto: (v: string) => string;
  femenino?: boolean;
}

export function useListado<T>(lista: T[] | null, buscarEn: (x: T) => string, criterios: Criterio<T>[], porPagina = 20) {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const todos = lista ?? [];
  const q = normalizar(busqueda);
  const filtrados = todos.filter((x) => (!q || normalizar(buscarEn(x)).includes(q))
    && criterios.every((c) => !filtros[c.id] || (c.valor(x) ?? '') === filtros[c.id]));
  const pag = usePaginado(filtrados, `${q}|${JSON.stringify(filtros)}`, porPagina);
  const opciones = (c: Criterio<T>) => [...new Set(todos.map(c.valor).filter((v): v is string => !!v))]
    .map((v) => ({ v, texto: c.texto(v) })).sort((a, b) => a.texto.localeCompare(b.texto));
  return {
    busqueda, setBusqueda, filtros, criterios, opciones, filtrados, pag, total: todos.length,
    setFiltro: (id: string, v: string) => setFiltros((f) => ({ ...f, [id]: v })),
    hayFiltros: q !== '' || Object.values(filtros).some(Boolean),
    limpiar: () => { setBusqueda(''); setFiltros({}); },
  };
}

export type EstadoListado<T> = ReturnType<typeof useListado<T>>;

interface ListadoProps<T> {
  l: EstadoListado<T>;
  idBase: string;
  titulo?: string;
  acciones?: React.ReactNode;
  buscar: string;
  /** «activos», «precios»…: completa «Mostrando 3 de 8 …». */
  sustantivo: string;
  cargando: boolean;
  vacio: { icono: React.ReactNode; titulo: string; detalle: string; accion?: React.ReactNode };
  children: (visibles: T[]) => React.ReactNode;
}

export function Listado<T>({ l, idBase, titulo, acciones, buscar, sustantivo, cargando, vacio, children }: ListadoProps<T>) {
  const { t } = useT('finanzas');
  const { pag } = l;
  const conDatos = l.total > 0;
  return (
    <section className="fin-listado" aria-label={titulo ?? sustantivo}>
      {(titulo || acciones) && (
        <div className="fin-listado__titulo">
          {titulo && <h2>{titulo}</h2>}
          {acciones && <div className="fin-acciones">{acciones}</div>}
        </div>
      )}
      {conDatos && (
        <div className="fin-filtros">
          <div className="fin-filtros__busqueda">
            <Input id={`${idBase}-buscar`} type="search" label={t('comun.buscar')} placeholder={buscar} leadingIcon={<Search size={16} />}
              value={l.busqueda} onChange={(e) => l.setBusqueda(e.target.value)} autoComplete="off" />
          </div>
          {l.criterios.map((c) => {
            const opciones = l.opciones(c);
            return (
              <Select key={c.id} id={`${idBase}-${c.id}`} label={c.etiqueta} value={l.filtros[c.id] ?? ''}
                disabled={opciones.length < 2 && !l.filtros[c.id]} onChange={(e) => l.setFiltro(c.id, e.target.value)}>
                <option value="">{c.femenino ? t('comun.todas') : t('comun.todos')}</option>
                {opciones.map((o) => <option key={o.v} value={o.v}>{o.texto}</option>)}
              </Select>
            );
          })}
          {l.hayFiltros && (
            <div className="fin-filtros__limpiar">
              <Button variant="ghost" size="md" onClick={l.limpiar}><FilterX size={16} aria-hidden />{t('comun.limpiar_filtros')}</Button>
            </div>
          )}
        </div>
      )}
      {!conDatos ? (
        <div className="fin-listado__vacio">
          <EstadoVacio icono={vacio.icono} titulo={cargando ? t('comun.cargando') : vacio.titulo} detalle={vacio.detalle} accion={vacio.accion} />
        </div>
      ) : l.filtrados.length === 0 ? (
        <div className="fin-listado__vacio">
          <EstadoVacio icono={<SearchX size={28} aria-hidden />} titulo={t('comun.sin_coincidencias')} detalle={t('comun.sin_coincidencias_detalle')}
            accion={<Button variant="secondary" size="md" onClick={l.limpiar}><FilterX size={16} aria-hidden />{t('comun.limpiar_filtros')}</Button>} />
        </div>
      ) : (
        <ScrollRegion label={titulo ?? sustantivo}>{children(pag.enPagina)}</ScrollRegion>
      )}
      {conDatos && (
        <div className="fin-listado__pie">
          <span role="status">{t('comun.mostrando', { n: l.filtrados.length, total: l.total, que: sustantivo })}</span>
          {pag.totalPaginas > 1 && <Paginacion pagina={pag.pagina} totalPaginas={pag.totalPaginas} onCambiar={pag.setPagina} sinResumen />}
        </div>
      )}
    </section>
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

/** Activo con su especie y finca debajo, como en las tablas del prototipo. */
export function CeldaActivo({ identificador, especie, finca }: { identificador: string; especie?: string | null; finca?: string | null }) {
  return (
    <>
      <strong>{identificador}</strong>
      {(especie || finca) && <span className="fin-secundario">{[especie, finca].filter(Boolean).join(' · ')}</span>}
    </>
  );
}
