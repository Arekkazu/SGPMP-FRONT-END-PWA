// | Fecha      | Nombre   | Que se hizo                                                             |
// |------------|----------|-------------------------------------------------------------------------|
// | 2026-11-14 | Arekkazu | M08 RF-103: widget con datos propios, estado, hora y acceso a su módulo  |
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CloudOff } from 'lucide-react';
import type { WidgetCatalogoItem, WidgetConfigDTO } from '../../configuration/types';
import { iconoWidget } from '../../configuration/iconos';
import { useT } from '../../shared/i18n/useT';
import { formatearHora } from '../../shared/i18n/formato';
import { useWidgetDatos } from '../hooks/useWidgetDatos';
import { Visual } from './visuales';

// Acceso rápido de cada widget a la pantalla de su módulo (los widgets son de solo lectura).
const DESTINO: Record<string, string> = {
  semaforo_areas: '/telemetria/alertas', alertas: '/telemetria/alertas', alertas_crit: '/telemetria/alertas',
  alertas_sanitarias: '/telemetria/alertas', temp_galpon: '/telemetria/monitoreo', hum_galpon: '/telemetria/monitoreo',
  ph_estanque: '/telemetria/monitoreo', co2_galpon: '/telemetria/monitoreo', lecturas_area: '/telemetria/monitoreo',
  hist_temp: '/telemetria/historial', hist_hum: '/telemetria/historial', estado_iot: '/telemetria/dispositivos',
  dispositivos_sin_senal: '/telemetria/dispositivos', cal_sensores: '/configuracion', cfg_pendiente: '/configuracion',
  fincas_estado: '/configuracion', inventario_especies: '/activos-biologicos', ultimos_eventos: '/activos-biologicos',
  conversion_alimenticia: '/suministros', riesgo_sanitario_alto: '/prediccion', distribucion_riesgo: '/prediccion',
  retroalimentacion_pendiente: '/prediccion', valor_inventario: '/finanzas', periodos_abiertos: '/finanzas',
  reconocimientos_pendientes: '/finanzas', precios_por_vencer: '/finanzas', integraciones_fallidas: '/integracion',
};

interface Props {
  celda: WidgetConfigDTO;
  widget: WidgetCatalogoItem;
  idFinca: number | null;
  frecuencia: number;
  idUsuario: number | null;
  enLinea: boolean;
}

/**
 * Un widget del dashboard. Pide sus propios datos: si falla, solo él muestra «Datos no disponibles»
 * y conserva lo último que tenía, con su hora (CA-5, CA-9). Sin datos, conserva su lugar en la grilla.
 */
export function WidgetCard({ celda, widget, idFinca, frecuencia, idUsuario, enLinea }: Props) {
  const { t } = useT('dashboard');
  const Icono = iconoWidget(widget.clave);
  const necesitaFinca = widget.requiere_finca !== false;
  const { respuesta, cargando, noDisponible, desdeCache, rechazo, recargar } = useWidgetDatos(
    widget.clave, idFinca, frecuencia, Boolean(widget.reacciona_a_alertas), idUsuario, !necesitaFinca || idFinca !== null,
  );
  const destino = DESTINO[widget.clave];

  let cuerpo: React.ReactNode;
  if (cargando && !respuesta) {
    cuerpo = <div aria-busy="true" style={{ flex: 1, minHeight: 80, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />;
  } else if (rechazo) {
    cuerpo = <Aviso texto={rechazo} />;
  } else if (!respuesta) {
    cuerpo = <Aviso texto={t('widget.no_disponible')} />;
  } else if (respuesta.estado !== 'OK') {
    cuerpo = <Aviso texto={respuesta.mensaje ?? t('widget.no_disponible')} />;
  } else {
    cuerpo = <Visual visual={widget.visual} clave={widget.clave} datos={respuesta.datos} />;
  }

  return (
    <article
      aria-label={widget.nombre}
      aria-busy={cargando}
      style={{
        gridColumn: `span ${celda.span_columnas}`,
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--s5)',
        boxShadow: 'var(--shadow-sm)',
        minHeight: 170,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s3)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
        <Icono size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
        <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, flex: 1 }}>{widget.nombre}</h2>
      </header>
      {respuesta?.alcance === 'todas' && widget.opciones?.some((o) => o.tipo === 'areas' || o.tipo === 'area') && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -8 }}>{t('widget.todas_las_areas')}</span>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{cuerpo}</div>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
        <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(noDisponible || desdeCache) && <CloudOff size={12} aria-hidden />}
          {respuesta && (noDisponible || desdeCache
            ? t('widget.ultima_actualizacion', { hora: formatearHora(respuesta.actualizado_en) })
            : t('widget.actualizado', { hora: formatearHora(respuesta.actualizado_en) }))}
          {noDisponible && !desdeCache && respuesta && ` · ${t('widget.no_disponible')}`}
        </span>
        {noDisponible && enLinea && (
          <button type="button" onClick={recargar}
            style={{ fontSize: 11, background: 'none', border: 0, padding: 0, color: 'var(--brand-600)', cursor: 'pointer', textDecoration: 'underline' }}>
            {t('widget.reintentar')}
          </button>
        )}
        {destino && !noDisponible && (enLinea
          ? <Link to={destino} style={{ fontSize: 12, fontWeight: 600 }}>{t('widget.ir_al_modulo')}</Link>
          : <span>{t('widget.con_conexion')}</span>)}
      </footer>
    </article>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div role="status" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--s2)', textAlign: 'center', color: 'var(--text-muted)' }}>
      <AlertTriangle size={20} aria-hidden color="var(--sem-warning)" />
      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{texto}</span>
    </div>
  );
}
