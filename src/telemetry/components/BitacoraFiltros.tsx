import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface BitacoraFiltrosState {
  tipo_evento: string;
  severidad_log: string;
  clasificacion_registro: string;
  resultado: string;
  entidad_afectada_id: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const BITACORA_FILTROS_VACIO: BitacoraFiltrosState = {
  tipo_evento: '', severidad_log: '', clasificacion_registro: '', resultado: '',
  entidad_afectada_id: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  value: BitacoraFiltrosState;
  onChange: (v: BitacoraFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function BitacoraFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof BitacoraFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="b-tipo">{t('bitacorafiltros.tipo_de_evento')}</label>
          <input id="b-tipo" style={INPUT} value={value.tipo_evento} onChange={set('tipo_evento')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-sev">{t('bitacorafiltros.severidad')}</label>
          <select id="b-sev" style={INPUT} value={value.severidad_log} onChange={set('severidad_log')}>
            <option value="">{t('bitacorafiltros.todas')}</option>
            <option value="INFO">{t('bitacorafiltros.info')}</option>
            <option value="WARNING">{t('bitacorafiltros.advertencia')}</option>
            <option value="ERROR">{t('bitacorafiltros.error')}</option>
            <option value="CRITICAL">{t('bitacorafiltros.critico')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-clas">{t('bitacorafiltros.clasificacion')}</label>
          <select id="b-clas" style={INPUT} value={value.clasificacion_registro} onChange={set('clasificacion_registro')}>
            <option value="">{t('bitacorafiltros.todas')}</option>
            <option value="NIC41">NIC 41 (5 años)</option>
            <option value="TECNICO">Técnico (1 año)</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-res">{t('bitacorafiltros.resultado')}</label>
          <select id="b-res" style={INPUT} value={value.resultado} onChange={set('resultado')}>
            <option value="">{t('bitacorafiltros.todos')}</option>
            <option value="EXITOSO">{t('bitacorafiltros.exitoso')}</option>
            <option value="FALLIDO">{t('bitacorafiltros.fallido')}</option>
            <option value="PARCIAL">{t('bitacorafiltros.parcial')}</option>
            <option value="RECHAZADO">{t('bitacorafiltros.rechazado')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-ent">{t('bitacorafiltros.id_entidad_afectada')}</label>
          <input id="b-ent" style={INPUT} value={value.entidad_afectada_id} onChange={set('entidad_afectada_id')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-desde">{t('bitacorafiltros.desde')}</label>
          <input id="b-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-hasta">{t('bitacorafiltros.hasta')}</label>
          <input id="b-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('bitacorafiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('bitacorafiltros.limpiar')}</Button>
      </div>
    </>
  );
}
