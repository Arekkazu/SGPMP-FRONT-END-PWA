import React from 'react';
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
  const set = (k: keyof BitacoraFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="b-tipo">Tipo de evento</label>
          <input id="b-tipo" style={INPUT} value={value.tipo_evento} onChange={set('tipo_evento')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-sev">Severidad</label>
          <select id="b-sev" style={INPUT} value={value.severidad_log} onChange={set('severidad_log')}>
            <option value="">Todas</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Advertencia</option>
            <option value="ERROR">Error</option>
            <option value="CRITICAL">Crítico</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-clas">Clasificación</label>
          <select id="b-clas" style={INPUT} value={value.clasificacion_registro} onChange={set('clasificacion_registro')}>
            <option value="">Todas</option>
            <option value="NIC41">NIC 41 (5 años)</option>
            <option value="TECNICO">Técnico (1 año)</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-res">Resultado</label>
          <select id="b-res" style={INPUT} value={value.resultado} onChange={set('resultado')}>
            <option value="">Todos</option>
            <option value="EXITOSO">Exitoso</option>
            <option value="FALLIDO">Fallido</option>
            <option value="PARCIAL">Parcial</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="b-ent">ID entidad afectada</label>
          <input id="b-ent" style={INPUT} value={value.entidad_afectada_id} onChange={set('entidad_afectada_id')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-desde">Desde</label>
          <input id="b-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="b-hasta">Hasta</label>
          <input id="b-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Aplicar filtros
        </Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>Limpiar</Button>
      </div>
    </>
  );
}
