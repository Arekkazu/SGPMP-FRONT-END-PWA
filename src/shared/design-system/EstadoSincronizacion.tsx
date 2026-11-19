// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 4: ícono de sincronización siempre visible y su detalle por módulo |
import React, { useState } from 'react';
import { CloudCheck, CloudAlert, CloudOff, CloudCog } from 'lucide-react';
import { useEstadoSincronizacion, type EstadoSync } from '../sync/estadoSincronizacion';
import { useT } from '../i18n/useT';
import { formatearFecha, formatearHora } from '../i18n/formato';
import { ModalShell } from './ModalShell';

const ICONOS: Record<EstadoSync, React.ReactNode> = {
  SINCRONIZADO: <CloudCheck size={18} aria-hidden />,
  SINCRONIZANDO: <CloudCog size={18} aria-hidden />,
  OFFLINE: <CloudOff size={18} aria-hidden />,
  CONFLICTO: <CloudAlert size={18} aria-hidden />,
};

/**
 * RF-107 tipo 4 (CA-06, CA-15): el estado de la conexión y de los datos, en todas las pantallas. Cambia a sin
 * conexión apenas el navegador la pierde y vuelve a sincronizado cuando terminan los envíos pendientes. Al tocarlo
 * muestra, por módulo, el estado, el último intercambio exitoso, los registros pendientes y la acción disponible.
 * No depende solo del color: siempre lleva el texto del estado.
 */
export function EstadoSincronizacion() {
  const { t } = useT('common');
  const { estado, modulos, desde } = useEstadoSincronizacion();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button type="button" className={`ds-sync ds-sync--${estado}`} onClick={() => setAbierto(true)}
              aria-label={t('sincronizacion.aria', { estado: t(`sincronizacion.estado.${estado}`) })}>
        {ICONOS[estado]}
        <span className="ds-sync__texto">{t(`sincronizacion.estado.${estado}`)}</span>
      </button>
      {abierto && (
        <ModalShell title={t('sincronizacion.titulo')} onClose={() => setAbierto(false)} maxWidth={640}
                    descripcion={estado === 'OFFLINE' && desde
                      ? t('sincronizacion.offline_desde', { hora: formatearHora(new Date(desde)) })
                      : t(`sincronizacion.descripcion.${estado}`)}>
          <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('sincronizacion.titulo')}>
            <table className="ds-sync__tabla">
              <thead>
                <tr>
                  <th scope="col">{t('sincronizacion.col.modulo')}</th>
                  <th scope="col">{t('sincronizacion.col.estado')}</th>
                  <th scope="col">{t('sincronizacion.col.ultimo')}</th>
                  <th scope="col">{t('sincronizacion.col.pendientes')}</th>
                  <th scope="col">{t('sincronizacion.col.accion')}</th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m.clave}>
                    <th scope="row">{t(`sincronizacion.modulo.${m.clave}`)}</th>
                    <td className={`ds-sync--${m.estado}`}>{t(`sincronizacion.estado.${m.estado}`)}</td>
                    <td>{m.ultimo ? `${formatearFecha(new Date(m.ultimo))} ${formatearHora(new Date(m.ultimo))}`
                      : t('sincronizacion.sin_intercambio')}</td>
                    <td>{m.pendientes + m.conflictos}</td>
                    <td>{m.estado === 'SINCRONIZADO' ? '—' : t(`sincronizacion.accion.${m.estado}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </>
  );
}
