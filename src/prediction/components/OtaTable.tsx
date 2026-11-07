// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 a11y 2.1.1: tabla con scroll enfocable y con nombre |
// | 2026-10-29 | Arekkazu | TC-DIS-174 RF-70 a11y 4.1.2: cada botón dice qué despliegue abre |
// | 2026-10-29 | Arekkazu | QA-M04-27-10 CU06 H-02 RF-70: nombre de la versión desplegada |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-18/T-19/T-23 RF-70: equipo por nombre, modo con etiqueta y tarjetas en celular |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19/T-22 RF-65/69/70: componentes con etiqueta y números en formato regional |
import React from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Eye } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { EstadoOtaPill } from './EstadoOtaPill';
import { etiquetaComponente, etiquetaTipoModelo, MODOS_DISTRIBUCION, type ModoDistribucion } from '../types';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from './tableStyles';
import type { DespliegueOtaResponse } from '../types';

/** «Edge galpón 1» (descripción o serial); el número solo si el backend no mandó nombre. */
export function nombreDispositivo(d: Pick<DespliegueOtaResponse, 'nombre_dispositivo' | 'id_dispositivo_iot'>): string {
  return d.nombre_dispositivo || `#${d.id_dispositivo_iot}`;
}

/** Etiqueta del modo de distribución; un modo fuera del catálogo se muestra tal cual. */
export function etiquetaModo(t: (k: string) => string, modo: string | null | undefined): string {
  if (!modo) return '—';
  return MODOS_DISTRIBUCION.includes(modo as ModoDistribucion) ? t(`distribucionform.modo_${modo.toLowerCase()}`) : modo;
}

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : formatearFechaHora(d);
}

interface Props {
  despliegues: DespliegueOtaResponse[];
  loading: boolean;
  onVer: (d: DespliegueOtaResponse) => void;
}

export function OtaTable({ despliegues, loading, onVer }: Props) {
  const { t } = useT('prediction');
  if (loading) return <div style={{ padding: 'var(--s7)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('otatable.cargando_despliegues')}</div>;
  if (despliegues.length === 0) {
    return (
      <div style={{ padding: 'var(--s8) var(--s4)', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--surface-border)', borderRadius: 'var(--r-lg)' }}>{t('otatable.no_hay_despliegues_que_coincidan_con_los')}</div>
    );
  }

  return (
    <div style={TABLE_WRAP} className="ds-scroll-region" tabIndex={0} role="region" aria-label="Tabla de despliegues OTA">
      {/* T-23: tarjetas por debajo de 768px (Layout.css). */}
      <table className="ds-tabla-tarjetas" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={THEAD_ROW}>
            <th scope="col" style={TH}>{t('otatable.dispositivo')}</th>
            <th scope="col" style={TH}>{t('otatable.tipo_de_modelo')}</th>
            <th scope="col" style={TH}>{t('otatable.version')}</th>
            <th scope="col" style={TH}>{t('otatable.modo')}</th>
            <th scope="col" style={TH}>{t('otatable.estado')}</th>
            <th scope="col" style={TH}>{t('otatable.inicio')}</th>
            <th scope="col" style={{ ...TH, textAlign: 'right' }}>{t('otatable.acciones')}</th>
          </tr>
        </thead>
        <tbody>
          {despliegues.map((d) => (
            <tr key={d.id_despliegue_ota}>
              {/* T-18: el equipo por nombre, no "#347". */}
              <td className="ds-celda-titulo" style={{ ...TD, fontWeight: 600 }}>{nombreDispositivo(d)}</td>
              <td data-label={t('otatable.tipo_de_modelo')} style={TD}>{etiquetaTipoModelo(d.tipo_modelo)}{d.componente && ` · ${etiquetaComponente(d.componente)}`}</td>
              <td data-label={t('otatable.version')} style={{ ...TD, fontFamily: 'var(--font-mono)' }}>{d.nombre_version ?? `v${d.id_version_modelo}`}</td>
              {/* T-19: "PROGRAMADO" → "Programado". */}
              <td data-label={t('otatable.modo')} style={TD}>{etiquetaModo(t, d.modo_distribucion)}</td>
              <td className="ds-celda-destacada" style={TD}><EstadoOtaPill estado={d.estado_despliegue} /></td>
              <td data-label={t('otatable.inicio')} style={{ ...TD, fontSize: '12px', whiteSpace: 'nowrap' }}>{fmt(d.fecha_inicio)}</td>
              <td className="ds-celda-accion" style={{ ...TD, textAlign: 'right' }}>
                <Button variant="ghost" size="sm" onClick={() => onVer(d)} aria-label={t('otatable.ver_despliegue_de', { version: d.nombre_version ?? `v${d.id_version_modelo}`, nodo: nombreDispositivo(d) })} title={t('otatable.ver_detalle')}>
                  <Eye size={16} aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
