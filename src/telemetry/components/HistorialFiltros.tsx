import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, Download } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';

export interface HistorialFiltrosState {
  fecha_inicio: string;   // yyyy-mm-dd (requerido)
  fecha_fin: string;      // yyyy-mm-dd (requerido)
  tipo_variable: string;
  categoria_variable: string;
  id_infraestructura: string;
  especie: string;
  estado_dato: string;
  origen_dato: string;
}


export const HISTORIAL_FILTROS_DEFAULT: HistorialFiltrosState = {
  fecha_inicio: diasAtrasLocal(30),
  fecha_fin: hoyLocal(),
  tipo_variable: '', categoria_variable: '', id_infraestructura: '', especie: '',
  estado_dato: '', origen_dato: '',
};

const RANGOS = [7, 30, 60, 90];

interface Props {
  value: HistorialFiltrosState;
  onChange: (v: HistorialFiltrosState) => void;
  onAplicar: () => void;
  onExportar: () => void;
  puedeExportar: boolean;
}

export function HistorialFiltros({ value, onChange, onAplicar, onExportar, puedeExportar }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof HistorialFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const aplicarRango = (n: number) => onChange({ ...value, fecha_inicio: diasAtrasLocal(n), fecha_fin: hoyLocal() });

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        {RANGOS.map((n) => (
          <Button key={n} variant="ghost" size="sm" onClick={() => aplicarRango(n)}>Últimos {n} días</Button>
        ))}
      </div>

      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="h-desde">{t('historialfiltros.desde')}</label>
          <input id="h-desde" type="date" style={INPUT} value={value.fecha_inicio} onChange={set('fecha_inicio')} aria-required />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-hasta">{t('historialfiltros.hasta')}</label>
          <input id="h-hasta" type="date" style={INPUT} value={value.fecha_fin} onChange={set('fecha_fin')} aria-required />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-var">{t('historialfiltros.variable')}</label>
          <input id="h-var" style={INPUT} placeholder={t('historialfiltros.ej_temperatura_ambiental')} value={value.tipo_variable} onChange={set('tipo_variable')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-cat">{t('historialfiltros.categoria')}</label>
          <select id="h-cat" style={INPUT} value={value.categoria_variable} onChange={set('categoria_variable')}>
            <option value="">{t('historialfiltros.todas')}</option>
            <option value="AMBIENTAL">{t('historialfiltros.ambiental')}</option>
            <option value="HIDRICA">{t('historialfiltros.hidrica')}</option>
            <option value="ANIMAL">{t('historialfiltros.animal')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-infra">{t('historialfiltros.id_infraestructura')}</label>
          <input id="h-infra" type="number" style={INPUT} value={value.id_infraestructura} onChange={set('id_infraestructura')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-esp">{t('historialfiltros.especie')}</label>
          <input id="h-esp" style={INPUT} value={value.especie} onChange={set('especie')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-estado">{t('historialfiltros.estado_de_la_lectura')}</label>
          <select id="h-estado" style={INPUT} value={value.estado_dato} onChange={set('estado_dato')}>
            <option value="">{t('historialfiltros.todas')}</option>
            <option value="LECTURA_VALIDA">{t('historialfiltros.validas')}</option>
            <option value="FUERA_DE_RANGO">{t('historialfiltros.fuera_de_rango')}</option>
            <option value="ERROR_CALIBRACION">{t('historialfiltros.error_de_calibracion')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-origen">{t('historialfiltros.origen_del_dato')}</label>
          <select id="h-origen" style={INPUT} value={value.origen_dato} onChange={set('origen_dato')}>
            <option value="">{t('historialfiltros.todos')}</option>
            <option value="TIEMPO_REAL">{t('historialfiltros.tiempo_real')}</option>
            <option value="BUFFER_LOCAL">{t('historialfiltros.desde_buffer_local')}</option>
            <option value="EDGE_AGREGADO">{t('historialfiltros.edge_agregado')}</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.consultar')}</Button>
        {puedeExportar && (
          <Button variant="secondary" size="sm" onClick={onExportar}>
            <Download size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.exportar')}</Button>
        )}
      </div>
    </>
  );
}
