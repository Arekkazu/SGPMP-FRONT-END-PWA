import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface CalidadFiltrosState {
  id_sensor: string;
  clasificacion: string;
  estado_evaluacion: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const CALIDAD_FILTROS_VACIO: CalidadFiltrosState = {
  id_sensor: '', clasificacion: '', estado_evaluacion: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  value: CalidadFiltrosState;
  onChange: (v: CalidadFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function CalidadFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof CalidadFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="c-sensor">{t('calidadfiltros.id_sensor')}</label>
          <input id="c-sensor" type="number" style={INPUT} value={value.id_sensor} onChange={set('id_sensor')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="c-clas">{t('calidadfiltros.clasificacion')}</label>
          <select id="c-clas" style={INPUT} value={value.clasificacion} onChange={set('clasificacion')}>
            <option value="">{t('calidadfiltros.todas')}</option>
            <option value="APTO">{t('calidadfiltros.aptas')}</option>
            <option value="APTO_CON_RESERVA">{t('calidadfiltros.con_reservas')}</option>
            <option value="NO_APTO">{t('calidadfiltros.no_aptas')}</option>
            <option value="INDETERMINADA">{t('calidadfiltros.indeterminadas')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="c-estado">{t('calidadfiltros.estado_evaluacion')}</label>
          <input id="c-estado" style={INPUT} value={value.estado_evaluacion} onChange={set('estado_evaluacion')} placeholder={t('calidadfiltros.ej_vigente')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="c-desde">{t('calidadfiltros.desde')}</label>
          <input id="c-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="c-hasta">{t('calidadfiltros.hasta')}</label>
          <input id="c-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('calidadfiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('calidadfiltros.limpiar')}</Button>
      </div>
    </>
  );
}
