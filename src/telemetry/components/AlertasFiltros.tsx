import React from 'react';
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
  const set = (k: keyof AlertasFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="al-estado">Estado</label>
          <select id="al-estado" style={INPUT} value={value.estado} onChange={set('estado')}>
            <option value="">Todos</option>
            <option value="ACTIVA">Activa</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="RESUELTA">Resuelta</option>
            <option value="DESCARTADA">Descartada</option>
            <option value="VENCIDA">Vencida</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="al-sev">Severidad</label>
          <select id="al-sev" style={INPUT} value={value.severidad} onChange={set('severidad')}>
            <option value="">Todas</option>
            <option value="CRITICO">Crítica</option>
            <option value="MODERADO">Moderada</option>
            <option value="LEVE">Leve</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="al-origen">Origen</label>
          <select id="al-origen" style={INPUT} value={value.origen_evento} onChange={set('origen_evento')}>
            <option value="">Todos</option>
            <option value="EDGE">Edge</option>
            <option value="BACKEND">Backend</option>
            <option value="IA">IA</option>
          </select>
        </div>
        {!ocultarTipo && (
          <div>
            <label style={LABEL} htmlFor="al-tipo">Tipo de alerta</label>
            <input id="al-tipo" style={INPUT} placeholder="Ej: ESTRES_TERMICO" value={value.tipo_alerta} onChange={set('tipo_alerta')} />
          </div>
        )}
        <div>
          <label style={LABEL} htmlFor="al-sensor">ID sensor</label>
          <input id="al-sensor" type="number" style={INPUT} value={value.id_sensor} onChange={set('id_sensor')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-activo">ID activo</label>
          <input id="al-activo" type="number" style={INPUT} value={value.id_activo_biologico} onChange={set('id_activo_biologico')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-desde">Desde</label>
          <input id="al-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-hasta">Hasta</label>
          <input id="al-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
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
