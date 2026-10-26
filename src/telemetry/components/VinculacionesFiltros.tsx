// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre en vez de «ID infraestructura» |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { SelectorArea } from './SelectorArea';
import type { AreaTelemetria } from '../hooks/useAreas';

export interface VinculacionesFiltrosState {
  estado_vinculacion: string;
  mecanismo_vinculacion: string;
  id_telemetria: string;
  /** ID que se envía; `area` es el texto del Combobox (T-18). */
  id_infraestructura: string;
  area: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const VINCULACIONES_FILTROS_VACIO: VinculacionesFiltrosState = {
  estado_vinculacion: '', mecanismo_vinculacion: '', id_telemetria: '', id_infraestructura: '', area: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  areas: AreaTelemetria[];
  value: VinculacionesFiltrosState;
  onChange: (v: VinculacionesFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function VinculacionesFiltros({ areas, value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof VinculacionesFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="v-estado">{t('vinculacionesfiltros.estado')}</label>
          <select id="v-estado" style={INPUT} value={value.estado_vinculacion} onChange={set('estado_vinculacion')}>
            <option value="">{t('vinculacionesfiltros.todos')}</option>
            <option value="CONFIRMADA">{t('vinculacionesfiltros.confirmada')}</option>
            <option value="AMBIGUA">{t('vinculacionesfiltros.ambigua')}</option>
            <option value="SIN_VINCULAR">{t('vinculacionesfiltros.sin_vincular')}</option>
            <option value="PENDIENTE_REVISION">{t('vinculacionesfiltros.pendiente_revision')}</option>
            <option value="SUPERADA">{t('vinculacionesfiltros.superada')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="v-mec">{t('vinculacionesfiltros.mecanismo')}</label>
          <select id="v-mec" style={INPUT} value={value.mecanismo_vinculacion} onChange={set('mecanismo_vinculacion')}>
            <option value="">{t('vinculacionesfiltros.todos')}</option>
            <option value="AUTOMATICA">{t('vinculacionesfiltros.automatica')}</option>
            <option value="MANUAL">{t('vinculacionesfiltros.manual')}</option>
            <option value="CORRECCION">{t('vinculacionesfiltros.correccion')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="v-tel">{t('vinculacionesfiltros.id_lectura')}</label>
          <input id="v-tel" type="number" style={INPUT} value={value.id_telemetria} onChange={set('id_telemetria')} />
        </div>
        <SelectorArea
          id="v-infra"
          areas={areas}
          value={value.area}
          onChange={(area, idArea) => onChange({ ...value, area, id_infraestructura: idArea != null ? String(idArea) : '' })}
        />
        <div>
          <label style={LABEL} htmlFor="v-desde">{t('vinculacionesfiltros.desde')}</label>
          <input id="v-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="v-hasta">{t('vinculacionesfiltros.hasta')}</label>
          <input id="v-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('vinculacionesfiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('vinculacionesfiltros.limpiar')}</Button>
      </div>
    </>
  );
}
