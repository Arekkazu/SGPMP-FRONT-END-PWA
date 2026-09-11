import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface AlertasFiltrosState {
  estado: string;
  severidad: string;
  origen_evento: string;
  tipo_alerta: string;
  id_sensor: string;
  id_activo_biologico: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const ALERTAS_FILTROS_VACIO: AlertasFiltrosState = {
  estado: '', severidad: '', origen_evento: '', tipo_alerta: '',
  id_sensor: '', id_activo_biologico: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  value: AlertasFiltrosState;
  onChange: (v: AlertasFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
  /** Oculta filtros no relevantes en alertas técnicas (tipo fijo). */
  ocultarTipo?: boolean;
}

export function AlertasFiltros({ value, onChange, onAplicar, onLimpiar, ocultarTipo }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof AlertasFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="al-estado">{t('alertasfiltros.estado')}</label>
          <select id="al-estado" style={INPUT} value={value.estado} onChange={set('estado')}>
            <option value="">{t('alertasfiltros.todos')}</option>
            <option value="ACTIVA">{t('alertasfiltros.activa')}</option>
            <option value="EN_ATENCION">{t('alertasfiltros.en_atencion')}</option>
            <option value="RESUELTA">{t('alertasfiltros.resuelta')}</option>
            <option value="DESCARTADA">{t('alertasfiltros.descartada')}</option>
            <option value="VENCIDA">{t('alertasfiltros.vencida')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="al-sev">{t('alertasfiltros.severidad')}</label>
          <select id="al-sev" style={INPUT} value={value.severidad} onChange={set('severidad')}>
            <option value="">{t('alertasfiltros.todas')}</option>
            <option value="CRITICO">{t('alertasfiltros.critica')}</option>
            <option value="MODERADO">{t('alertasfiltros.moderada')}</option>
            <option value="LEVE">{t('alertasfiltros.leve')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="al-origen">{t('alertasfiltros.origen')}</label>
          <select id="al-origen" style={INPUT} value={value.origen_evento} onChange={set('origen_evento')}>
            <option value="">{t('alertasfiltros.todos')}</option>
            <option value="EDGE">{t('alertasfiltros.edge')}</option>
            <option value="BACKEND">{t('alertasfiltros.backend')}</option>
            <option value="IA">IA</option>
          </select>
        </div>
        {!ocultarTipo && (
          <div>
            <label style={LABEL} htmlFor="al-tipo">{t('alertasfiltros.tipo_de_alerta')}</label>
            <input id="al-tipo" style={INPUT} placeholder={t('alertasfiltros.ej_estres_termico')} value={value.tipo_alerta} onChange={set('tipo_alerta')} />
          </div>
        )}
        <div>
          <label style={LABEL} htmlFor="al-sensor">{t('alertasfiltros.id_sensor')}</label>
          <input id="al-sensor" type="number" style={INPUT} value={value.id_sensor} onChange={set('id_sensor')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-activo">{t('alertasfiltros.id_activo')}</label>
          <input id="al-activo" type="number" style={INPUT} value={value.id_activo_biologico} onChange={set('id_activo_biologico')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-desde">{t('alertasfiltros.desde')}</label>
          <input id="al-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-hasta">{t('alertasfiltros.hasta')}</label>
          <input id="al-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('alertasfiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('alertasfiltros.limpiar')}</Button>
      </div>
    </>
  );
}
