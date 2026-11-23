// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: cómo se dibuja cada widget (semáforo, cifras, listas…)  |
// | 2026-11-19 | Arekkazu | M8-16 RF-103: plurales correctos y nombres de área completos en el semáforo |
// | 2026-11-22 | Arekkazu | A11Y2-M08 TC-DIS-278..280 RF-103: alertas por área, barras con estado y tabla alternativa, íconos de estado |
// | 2026-11-23 | Arekkazu | QA-M08 CU01 H-03 RF-103: el nombre del área ocupa su línea; estado y alertas van debajo |
import React, { Suspense, lazy } from 'react';
import { AlertTriangle, Ban, CheckCircle2, CircleSlash, Clock, OctagonAlert, Power, Radio, Stethoscope, Wrench } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { formatearFecha, formatearNumero, formatearRelativo } from '../../shared/i18n/formato';

type Datos = Record<string, unknown>;
type Fila = Record<string, unknown>;

const LineaHistorico = lazy(() => import('./LineaHistorico'));

const COLOR_SEMAFORO: Record<string, { color: string; fondo: string; Icono: typeof CheckCircle2 }> = {
  VERDE: { color: 'var(--sem-success)', fondo: 'var(--sem-success-bg)', Icono: CheckCircle2 },
  AMARILLO: { color: 'var(--sem-warning)', fondo: 'var(--sem-warning-bg)', Icono: AlertTriangle },
  ROJO: { color: 'var(--sem-error)', fondo: 'var(--sem-error-bg)', Icono: OctagonAlert },
  SIN_DATOS: { color: 'var(--text-muted)', fondo: 'var(--surface-hover)', Icono: CircleSlash },
};

const texto = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));
/** Alertas activas del área: el backend da el total (`alertas`) o sus partes (críticas y advertencias). */
const alertasDe = (a: Fila) => Number(a.alertas ?? Number(a.criticas ?? 0) + Number(a.advertencias ?? 0));
const filas = (datos: Datos, campo = 'items') => (Array.isArray(datos[campo]) ? (datos[campo] as Fila[]) : []);

/** Un estado del semáforo con color, ícono y palabra: se entiende sin leer números (CA-7). */
export function EstadoSemaforo({ estado, grande = false }: { estado: string; grande?: boolean }) {
  const { t } = useT('dashboard');
  const { color, fondo, Icono } = COLOR_SEMAFORO[estado] ?? COLOR_SEMAFORO.SIN_DATOS;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: grande ? '6px 12px' : '2px 8px',
      borderRadius: 999, background: fondo, color, fontWeight: 700, fontSize: grande ? 15 : 12 }}>
      <Icono size={grande ? 20 : 14} aria-hidden />
      {t(`semaforo.${estado}`, { defaultValue: estado })}
    </span>
  );
}

function Semaforo({ datos }: { datos: Datos }) {
  const { t } = useT('dashboard');
  const areas = filas(datos, 'areas');
  const peor = ['ROJO', 'AMARILLO', 'SIN_DATOS', 'VERDE'].find((e) => areas.some((a) => a.estado === e)) ?? 'SIN_DATOS';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <EstadoSemaforo estado={peor} grande />
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--s3)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {areas.map((a) => (
          // CU01 H-03: en una sola fila con el estado y las alertas, el nombre quedaba con unos pocos píxeles y se
          // partía letra a letra. Ahora tiene su propia línea y solo corta dentro de una palabra más ancha que la celda.
          <li key={String(a.id_infraestructura)} style={{ display: 'flex', flexDirection: 'column', gap: 4,
            fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ overflowWrap: 'break-word', color: 'var(--text-primary)' }}>{texto(a.nombre)}</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <EstadoSemaforo estado={String(a.estado)} />
              {/* 1.1.1 / 4.1.2 (TC-DIS-278): cuántas alertas tiene, no solo el color del estado. */}
              {alertasDe(a) > 0 && <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{t('semaforo.alertas', { count: alertasDe(a) })}</span>}
            </span>
          </li>
        ))}
      </ul>
      {areas.length > 0 && <span className="ds-sr-only">{t('semaforo.peor', { estado: t(`semaforo.${peor}`) })}</span>}
    </div>
  );
}

function Lecturas({ datos }: { datos: Datos }) {
  const { t } = useT('dashboard');
  const lecturas = filas(datos, 'lecturas');
  if (lecturas.length === 1) {
    const l = lecturas[0];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {formatearNumero(l.valor as number, { maximumFractionDigits: 1 })} <span style={{ fontSize: 16 }}>{texto(l.unidad)}</span>
        </p>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{texto(l.area)} · {texto(l.sensor)}</span>
        <EstadoSemaforo estado={l.desactualizado ? 'SIN_DATOS' : semaforoDeLectura(l.semaforo)} />
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lecturas.slice(0, 8).map((l) => (
        <li key={String(l.id_sensor)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {texto(l.variable)} · {texto(l.area)}
          </span>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: COLOR_SEMAFORO[semaforoDeLectura(l.semaforo)].color }}>
            {formatearNumero(l.valor as number, { maximumFractionDigits: 1 })} {texto(l.unidad)}
          </span>
        </li>
      ))}
      {lecturas.length > 8 && <li style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('widget.total_mas', { cantidad: lecturas.length - 8 })}</li>}
    </ul>
  );
}

/** El monitoreo usa GRIS para «sin umbral o sin datos»; en el dashboard es «Sin datos». */
const semaforoDeLectura = (v: unknown) => (v === 'VERDE' || v === 'AMARILLO' || v === 'ROJO' ? v : 'SIN_DATOS');

const COP = { style: 'currency', currency: 'COP', maximumFractionDigits: 0 } as const;

function Cifra({ datos }: { datos: Datos }) {
  const { t } = useT('dashboard');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
        {formatearNumero(datos.valor_total as number, COP)}
      </p>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('valor.activos', { cantidad: datos.activos, count: Number(datos.activos) })}</span>
      {datos.vista === 'POR_METODO' && (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px', fontSize: 13 }}>
          <dt style={{ color: 'var(--text-secondary)' }}>{t('valor.razonable')}</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>{formatearNumero(datos.valor_razonable as number, COP)}</dd>
          <dt style={{ color: 'var(--text-secondary)' }}>{t('valor.costo')}</dt>
          <dd style={{ margin: 0, fontWeight: 700 }}>{formatearNumero(datos.valor_costo as number, COP)}</dd>
        </dl>
      )}
    </div>
  );
}

function Conversion({ datos }: { datos: Datos }) {
  const { t } = useT('dashboard');
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {filas(datos, 'especies').map((e) => {
        const estado = Number(e.criticos) > 0 ? 'ROJO' : Number(e.en_alerta) > 0 ? 'AMARILLO' : 'VERDE';
        return (
          <li key={String(e.especie)} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{texto(e.especie)}</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {formatearNumero(e.valor as number, { maximumFractionDigits: 2 })}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}> {t('conversion.unidad')}</span>
            </span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <EstadoSemaforo estado={estado} />
              {Number(e.en_alerta) > 0 && <span style={{ fontSize: 12 }}>{t('conversion.en_alerta', { cantidad: e.en_alerta })}</span>}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('conversion.al', { fecha: formatearFecha(e.fecha_fin_periodo as string) })}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Series de cada widget de barras: campo, relleno e ícono. Los rellenos son tokens -solid (fijos en los dos temas,
// con texto blanco a 4,5:1 o más); un token de texto (--sem-*) como relleno daba 2,4:1 en oscuro (TC-DIS-279/280).
type Serie = [string, string, typeof CheckCircle2];
const SERIES: Record<string, { campo: string; filas: string; etiqueta: string; series: Serie[] }> = {
  inventario_especies: { campo: 'especie', filas: 'especies', etiqueta: 'valores.inventario',
    series: [['activos', 'var(--sem-success-solid)', CheckCircle2], ['en_tratamiento', 'var(--sem-warning-solid)', Stethoscope], ['bajas', 'var(--sem-neutral-solid)', Ban]] },
  distribucion_riesgo: { campo: 'especie', filas: 'especies', etiqueta: 'valores.riesgo',
    series: [['normal', 'var(--sem-success-solid)', CheckCircle2], ['moderado', 'var(--sem-warning-solid)', AlertTriangle], ['alto', 'var(--sem-error-solid)', OctagonAlert]] },
  alertas_sanitarias: { campo: 'tipo', filas: 'tipos', etiqueta: 'valores.alertas_sanitarias',
    series: [['criticas', 'var(--sem-error-solid)', OctagonAlert], ['no_criticas', 'var(--sem-warning-solid)', AlertTriangle]] },
};

const PORCENTAJE = { style: 'percent', maximumFractionDigits: 0 } as const;

/**
 * Barras apiladas con CSS: livianas y legibles en 360 px. Cada tramo dice su estado y su número (1.3.1), los tramos
 * van separados por una línea blanca (1.4.11: contraste entre vecinos) y la tabla alternativa repite los datos con
 * encabezados de fila y columna (1.1.1).
 */
function Barras({ clave, datos }: { clave: string; datos: Datos }) {
  const { t } = useT('dashboard');
  const def = SERIES[clave];
  if (!def) return null;
  const items = filas(datos, def.filas).map((f) =>
    clave === 'alertas_sanitarias' ? { ...f, no_criticas: Number(f.total) - Number(f.criticas) } : f);
  if (items.length === 0) return <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('widget.sin_alertas')}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
        {def.series.map(([serie, color, Icono]) => (
          <li key={serie} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icono size={14} color={color} aria-hidden />
            {t(`${def.etiqueta}.${serie}`)}
          </li>
        ))}
      </ul>
      {items.map((f) => {
        const total = def.series.reduce((s, [serie]) => s + Number(f[serie] ?? 0), 0);
        const nombre = clave === 'alertas_sanitarias' ? t(`valores.tipo_alerta.${String(f.tipo)}`, { defaultValue: String(f.tipo) }) : texto(f[def.campo]);
        return (
          <div key={String(f[def.campo])} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{nombre}</span>
            <div role="img" aria-label={def.series.map(([s]) => `${t(`${def.etiqueta}.${s}`)}: ${f[s] ?? 0}`).join(', ')}
              style={{ display: 'flex', flexWrap: 'wrap', minHeight: 20, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-hover)' }}>
              {total > 0 && def.series.filter(([serie]) => Number(f[serie] ?? 0) > 0).flatMap(([serie, color], i) => {
                const n = Number(f[serie] ?? 0);
                const tramo = (
                  <span key={serie} style={{ flex: `${n} 1 auto`, minWidth: 'max-content', padding: '0 6px', background: color, color: '#ffffff',
                    fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: '20px' }}>{`${t(`${def.etiqueta}.${serie}`)}: ${n}`}</span>
                );
                return i === 0 ? [tramo] : [<i key={`${serie}-sep`} aria-hidden style={{ width: 2, background: '#ffffff' }} />, tramo];
              })}
            </div>
          </div>
        );
      })}
      <table className="ds-sr-only">
        <caption>{t(`${def.etiqueta}.tabla`)}</caption>
        <thead><tr>
          <th scope="col">{t(`${def.etiqueta}.col_fila`)}</th>
          {def.series.map(([s]) => <th key={s} scope="col">{t(`${def.etiqueta}.${s}`)}</th>)}
          {clave === 'distribucion_riesgo' && <><th scope="col">{t('valores.riesgo.enfermedad')}</th><th scope="col">{t('valores.riesgo.probabilidad')}</th></>}
        </tr></thead>
        <tbody>
          {items.map((f) => (
            <tr key={String(f[def.campo])}>
              <th scope="row">{clave === 'alertas_sanitarias' ? t(`valores.tipo_alerta.${String(f.tipo)}`, { defaultValue: String(f.tipo) }) : texto(f[def.campo])}</th>
              {def.series.map(([s]) => <td key={s}>{Number(f[s] ?? 0)}</td>)}
              {clave === 'distribucion_riesgo' && <>
                <td>{f.patologia ? String(f.patologia) : t('valores.riesgo.sin_prediccion')}</td>
                <td>{typeof f.probabilidad === 'number' ? formatearNumero(f.probabilidad, PORCENTAJE) : t('valores.riesgo.sin_prediccion')}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
      {/* RF-103 (TC-DIS-279): la enfermedad más probable de cada especie y su probabilidad, también a la vista. */}
      {clave === 'distribucion_riesgo' && items.some((f) => f.patologia) && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
          {items.filter((f) => f.patologia).map((f) => (
            <li key={String(f[def.campo])}>{t('valores.riesgo.principal', { especie: texto(f[def.campo]), enfermedad: String(f.patologia),
              probabilidad: typeof f.probabilidad === 'number' ? formatearNumero(f.probabilidad, PORCENTAJE) : '—' })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 1.4.1 (TC-DIS-280): cada estado de dispositivo con su ícono; cuatro de cinco comparten color.
const ICONO_DISPOSITIVO: Record<string, typeof CheckCircle2> = {
  ACTIVO: CheckCircle2, BUFFER_ACTIVO: Clock, 'SIN_SEÑAL': Radio, INACTIVO: Power, EN_MANTENIMIENTO: Wrench,
};

function Estados({ datos }: { datos: Datos }) {
  const { t } = useT('dashboard');
  const conteo = (datos.conteo ?? {}) as Record<string, number>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('estados_iot.total', { cantidad: datos.total, count: Number(datos.total) })}</span>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(conteo).map(([estado, n]) => {
          const Icono = ICONO_DISPOSITIVO[estado] ?? CircleSlash;
          return (
            <li key={estado} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: estado === 'ACTIVO' ? 'var(--sem-success-bg)' : 'var(--sem-warning-bg)',
              color: estado === 'ACTIVO' ? 'var(--sem-success)' : 'var(--sem-warning)' }}>
              <Icono size={12} aria-hidden />
              {t(`valores.estado_dispositivo.${estado}`, { defaultValue: estado })}: {n}
            </li>
          );
        })}
      </ul>
      <Lista clave="dispositivos_sin_senal" datos={{ items: filas(datos) }} />
    </div>
  );
}

/** Una línea de cada lista: qué es, el detalle y cuándo. Los códigos se traducen; nunca se muestran crudos. */
function Linea1({ clave, f }: { clave: string; f: Fila }) {
  const { t } = useT('dashboard');
  const fecha = (v: unknown) => formatearFecha(v as string);
  switch (clave) {
    case 'alertas':
    case 'alertas_crit':
      return <>{t(`valores.tipo_alerta.${String(f.tipo)}`, { defaultValue: String(f.tipo) })} · {texto(f.area)}
        <small> {f.valor != null ? `${formatearNumero(f.valor as number)} ${texto(f.unidad)} · ` : ''}{formatearRelativo(f.fecha_generacion as string)}</small></>;
    case 'riesgo_sanitario_alto':
      return <>{texto(f.activo)} · {texto(f.especie)}<small> {texto(f.patologia)} · {texto(f.area)} · {formatearRelativo(f.fecha_inferencia as string)}</small></>;
    case 'retroalimentacion_pendiente':
      return <>{texto(f.activo)} · {texto(f.especie)}<small> {texto(f.patologia)} · {formatearRelativo(f.fecha_inferencia as string)}</small></>;
    case 'periodos_abiertos':
      return <>{t('lista.periodo', { inicio: fecha(f.fecha_inicio), fin: fecha(f.fecha_fin) })}
        <small> {t(`valores.estado_periodo.${String(f.estado)}`, { defaultValue: String(f.estado) })}{f.titular ? ` · ${String(f.titular)}` : ''}</small></>;
    case 'reconocimientos_pendientes':
      return <>{texto(f.activo)} · {texto(f.especie)}<small> {texto(f.finca)}</small></>;
    case 'integraciones_fallidas':
      return <>{texto(f.cliente)}<small> {t(`valores.estado_integracion.${String(f.estado)}`, { defaultValue: String(f.estado) })} · {formatearRelativo(f.fecha as string)}</small></>;
    case 'precios_por_vencer':
      return <>{texto(f.especie)} · {formatearNumero(f.precio_unitario as number, COP)} / {texto(f.unidad_medida)}
        <small> {Number(f.dias_restantes) === 0 ? t('lista.vence_hoy') : t('lista.vence_en', { dias: f.dias_restantes, count: Number(f.dias_restantes) })}</small></>;
    case 'dispositivos_sin_senal':
      return <>{texto(f.serial)} · {texto(f.area)}<small> {t(`valores.estado_dispositivo.${String(f.estado)}`, { defaultValue: String(f.estado) })} · {f.fecha_ultimo_contacto ? t('lista.ultimo_contacto', { cuando: formatearRelativo(f.fecha_ultimo_contacto as string) }) : t('lista.nunca')}</small></>;
    case 'cal_sensores':
      return <>{texto(f.serial)} · {texto(f.area)}<small> {t('lista.calibrado', { fecha: fecha(f.ultima_calibracion) })}</small></>;
    case 'cfg_pendiente':
      return <>{texto(f.serial)}<small> {texto(f.area)}</small></>;
    case 'fincas_estado':
      return <>{texto(f.nombre)}<small> {t('lista.areas', { count: Number(f.areas_activas ?? 0) })} · {t('lista.dispositivos', { count: Number(f.dispositivos_activos ?? 0) })}</small></>;
    case 'ultimos_eventos':
      return <>{t(`valores.tipo_evento.${String(f.tipo)}`, { defaultValue: String(f.tipo) })} · {texto(f.activo)}<small> {formatearRelativo(f.fecha as string)}</small></>;
    default:
      return <>{Object.values(f).slice(0, 2).map(texto).join(' · ')}</>;
  }
}

function Lista({ clave, datos }: { clave: string; datos: Datos }) {
  const { t } = useT('dashboard');
  const items = filas(datos);
  const total = typeof datos.total === 'number' ? datos.total : items.length;
  if (items.length === 0) return <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('widget.nada_pendiente')}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {typeof datos.total === 'number' && <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{total}</p>}
      <ul className="dashboard-lista" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((f, i) => (
          <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column',
            borderLeft: f.severidad === 'CRITICO' ? '3px solid var(--sem-error)' : '3px solid transparent', paddingLeft: 6 }}>
            <Linea1 clave={clave} f={f} />
          </li>
        ))}
      </ul>
      {total > items.length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('widget.total_mas', { cantidad: total - items.length })}</span>}
    </div>
  );
}

export function Visual({ visual, clave, datos }: { visual: string | null | undefined; clave: string; datos: Datos }) {
  switch (visual) {
    case 'semaforo': return <Semaforo datos={datos} />;
    case 'lecturas': return <Lecturas datos={datos} />;
    case 'cifra': return <Cifra datos={datos} />;
    case 'conversion': return <Conversion datos={datos} />;
    case 'barras': return <Barras clave={clave} datos={datos} />;
    case 'estados': return <Estados datos={datos} />;
    case 'linea':
      return <Suspense fallback={<div style={{ height: 160 }} aria-busy="true" />}><LineaHistorico datos={datos} /></Suspense>;
    default: return <Lista clave={clave} datos={datos} />;
  }
}
