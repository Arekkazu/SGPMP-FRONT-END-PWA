// | Fecha      | Nombre   | Que se hizo                                                        |
// |------------|----------|--------------------------------------------------------------------|
// | 2026-10-29 | Arekkazu | INC-M03-211-G98 RF-58 CA-11: panel integrado de alertas activas    |
import { BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatearNumero, formatearRelativo, formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { SeveridadBadge } from './SeveridadBadge';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import type { PanelAlertasActivasSchema } from '../types';
import './PanelAlertasActivas.css';

/**
 * RF-58 CU04 salida 2: alertas ACTIVA de RF-57, CRITICO primero (el backend las ordena),
 * con tipo, variable, tiempo transcurrido y acceso al activo biológico afectado.
 */
export function PanelAlertasActivas({ panel }: { panel: PanelAlertasActivasSchema }) {
  const { t } = useT('telemetry');
  return (
    <section className="panel-alertas" aria-labelledby="panel-alertas-titulo">
      <h2 id="panel-alertas-titulo" className="panel-alertas__titulo">
        <BellRing size={18} aria-hidden />
        {t('panelalertas.titulo', { count: panel.total, n: formatearNumero(panel.total) })}
      </h2>
      {panel.alertas.length === 0 ? (
        <p className="panel-alertas__vacio">{t('panelalertas.sin_alertas')}</p>
      ) : (
        <ul className="panel-alertas__lista">
          {panel.alertas.map((a) => (
            <li key={a.id_alerta} className="panel-alertas__item">
              <SeveridadBadge severidad={a.severidad} />
              <span className="panel-alertas__tipo">{etiquetaCodigo(a.tipo_alerta)}</span>
              <span className="panel-alertas__dato">
                {etiquetaCodigo(a.tipo_variable)}
                {a.valor != null && ` · ${a.valor}${a.unidad ? ` ${a.unidad}` : ''}`}
              </span>
              <time className="panel-alertas__dato" dateTime={a.fecha_generacion} title={formatearFechaHora(a.fecha_generacion)}>
                {formatearRelativo(a.fecha_generacion)}
              </time>
              {a.id_activo_biologico != null && (
                <Link className="panel-alertas__enlace" to={`/activos-biologicos/${a.id_activo_biologico}`}>
                  {t('panelalertas.ver_activo', { activo: a.identificador_activo ?? `#${a.id_activo_biologico}` })}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {panel.total > panel.alertas.length && (
        <p className="panel-alertas__vacio">
          {t('panelalertas.mas', { n: formatearNumero(panel.total - panel.alertas.length) })}{' '}
          <Link className="panel-alertas__enlace" to="/telemetria/alertas">{t('panelalertas.ver_todas')}</Link>
        </p>
      )}
    </section>
  );
}
