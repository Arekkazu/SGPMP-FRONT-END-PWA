// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-107 tipo 4: ícono de sincronización siempre visible y su detalle por módulo |
// | 2026-11-22 | Arekkazu | INC-M08-394-G031 RF-107: detalle del conflicto, acciones, cola y caché sin conexión, fecha AAAA-MM-DD HH:MM |
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { CloudCheck, CloudAlert, CloudOff, CloudCog } from 'lucide-react';
import { useEstadoSincronizacion, type EstadoSync } from '../sync/estadoSincronizacion';
import type { SyncOperation } from '../db/db';
import { useT } from '../i18n/useT';
import { Button } from './Button';
import { ModalShell } from './ModalShell';

const ICONOS: Record<EstadoSync, React.ReactNode> = {
  SINCRONIZADO: <CloudCheck size={18} aria-hidden />,
  SINCRONIZANDO: <CloudCog size={18} aria-hidden />,
  OFFLINE: <CloudOff size={18} aria-hidden />,
  CONFLICTO: <CloudAlert size={18} aria-hidden />,
};

/** Pantalla de cada módulo, donde se resuelve su conflicto o se revisan sus registros. */
const RUTA_MODULO: Record<string, string> = {
  activos: '/activos-biologicos', telemetria: '/telemetria', prediccion: '/prediccion', suministros: '/suministros',
  finanzas: '/finanzas', integracion: '/integracion',
};

/** RF-107 8.4: las fechas del panel van como AAAA-MM-DD HH:MM, en la hora del usuario. */
export function fechaSync(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Lo que el usuario guardó en la operación, sin nombres de campos: los valores de texto o número. */
function valorLocal(payload: unknown): string {
  if (payload === null || payload === undefined) return '';
  if (typeof payload !== 'object') return String(payload);
  return Object.values(payload as Record<string, unknown>)
    .filter((v) => typeof v === 'string' || typeof v === 'number').slice(0, 3).map(String).join(' · ');
}

/**
 * RF-107 tipo 4 (CA-06, CA-15): el estado de la conexión y de los datos, en todas las pantallas. Cambia a sin
 * conexión apenas el navegador la pierde y vuelve a sincronizado cuando terminan los envíos pendientes. Al tocarlo
 * muestra, por módulo, el estado, el último intercambio exitoso, los registros pendientes y la acción disponible;
 * en conflicto, el dato que choca con su valor local, el del servidor y la fecha; sin conexión, desde cuándo, qué
 * espera en la cola y qué módulos tienen datos guardados. No depende solo del color: siempre lleva el texto.
 */
export function EstadoSincronizacion() {
  const { t } = useT('common');
  const history = useHistory();
  const { estado, modulos, desde, operaciones } = useEstadoSincronizacion();
  const [abierto, setAbierto] = useState(false);
  const [verCola, setVerCola] = useState<string | null>(null);
  const conflictos = operaciones.filter((op) => op.conflicto);
  const enCola = (clave: string) => operaciones.filter((op) => !op.conflicto && (op.modulo === clave || op.modulo?.startsWith(clave)));
  const minutosSinRed = desde ? Math.max(0, Math.round((Date.now() - desde) / 60_000)) : 0;
  const conCache = modulos.filter((m) => m.ultimo !== null);
  const accion = (op: SyncOperation) => t(`sincronizacion.operacion.${op.accion}`, { defaultValue: t('sincronizacion.operacion.otra') });
  const irA = (clave: string) => { setAbierto(false); history?.push(RUTA_MODULO[clave] ?? '/'); };
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
                      ? t('sincronizacion.offline_desde', { fecha: fechaSync(desde), count: minutosSinRed })
                      : t(`sincronizacion.descripcion.${estado}`)}>
          {conflictos.length > 0 && (
            <section aria-labelledby="sync-conflictos" style={{ marginBottom: 'var(--s4)' }}>
              <h3 id="sync-conflictos" style={{ fontSize: 14, margin: '0 0 var(--s2)' }}>{t('sincronizacion.conflictos_titulo')}</h3>
              <ul style={{ margin: 0, paddingLeft: 'var(--s5)', display: 'grid', gap: 'var(--s2)', fontSize: 13 }}>
                {conflictos.map((op) => (
                  <li key={op.id}>
                    <strong>{t(`sincronizacion.modulo.${op.modulo}`, { defaultValue: op.modulo })}: {accion(op)}</strong>
                    <div>{t('sincronizacion.valor_local', { valor: valorLocal(op.payload) || t('sincronizacion.sin_valor') })}</div>
                    <div>{t('sincronizacion.valor_servidor', { valor: op.servidor ?? op.error ?? t('sincronizacion.sin_valor') })}</div>
                    <div>{t('sincronizacion.conflicto_desde', { fecha: fechaSync(op.fechaConflicto ?? op.creadoEn) })}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {estado === 'OFFLINE' && (
            <p style={{ fontSize: 13, margin: '0 0 var(--s4)' }}>{conCache.length
              ? t('sincronizacion.con_cache', { modulos: conCache.map((m) => t(`sincronizacion.modulo.${m.clave}`)).join(', ') })
              : t('sincronizacion.sin_cache')}</p>
          )}
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
                    <td>{m.ultimo ? fechaSync(m.ultimo) : t('sincronizacion.sin_intercambio')}</td>
                    <td>{m.pendientes + m.conflictos}</td>
                    <td>
                      {/* CA-15: la acción es un control, no una instrucción en texto. */}
                      {m.estado === 'CONFLICTO' && <Button variant="secondary" size="sm" onClick={() => irA(m.clave)}>{t('sincronizacion.resolver')}</Button>}
                      {m.estado === 'OFFLINE' && m.pendientes > 0 && (
                        <Button variant="ghost" size="sm" aria-expanded={verCola === m.clave} onClick={() => setVerCola(verCola === m.clave ? null : m.clave)}>{t('sincronizacion.ver_cola')}</Button>
                      )}
                      {m.estado === 'SINCRONIZANDO' && (
                        <Button variant="ghost" size="sm" aria-expanded={verCola === m.clave} onClick={() => setVerCola(verCola === m.clave ? null : m.clave)}>{t('sincronizacion.ver_detalle')}</Button>
                      )}
                      {(m.estado === 'SINCRONIZADO' || (m.estado === 'OFFLINE' && m.pendientes === 0)) && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {verCola && (
            <section aria-labelledby="sync-cola" style={{ marginTop: 'var(--s4)', fontSize: 13 }}>
              <h3 id="sync-cola" style={{ fontSize: 14, margin: '0 0 var(--s2)' }}>{t('sincronizacion.cola_titulo', { modulo: t(`sincronizacion.modulo.${verCola}`) })}</h3>
              <ul style={{ margin: 0, paddingLeft: 'var(--s5)' }}>
                {enCola(verCola).map((op) => <li key={op.id}>{`${accion(op)} · ${fechaSync(op.creadoEn)}`}</li>)}
                {enCola(verCola).length === 0 && <li>{t('sincronizacion.cola_vacia')}</li>}
              </ul>
            </section>
          )}
        </ModalShell>
      )}
    </>
  );
}
