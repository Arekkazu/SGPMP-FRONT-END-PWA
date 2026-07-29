import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface VinculacionesFiltrosState {
  estado_vinculacion: string;
  mecanismo_vinculacion: string;
  id_telemetria: string;
  id_infraestructura: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const VINCULACIONES_FILTROS_VACIO: VinculacionesFiltrosState = {
  estado_vinculacion: '', mecanismo_vinculacion: '', id_telemetria: '', id_infraestructura: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  value: VinculacionesFiltrosState;
  onChange: (v: VinculacionesFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
}

export function VinculacionesFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const set = (k: keyof VinculacionesFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="v-estado">Estado</label>
          <select id="v-estado" style={INPUT} value={value.estado_vinculacion} onChange={set('estado_vinculacion')}>
            <option value="">Todos</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="AMBIGUA">Ambigua</option>
            <option value="SIN_VINCULAR">Sin vincular</option>
            <option value="PENDIENTE_REVISION">Pendiente revisión</option>
            <option value="SUPERADA">Superada</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="v-mec">Mecanismo</label>
          <select id="v-mec" style={INPUT} value={value.mecanismo_vinculacion} onChange={set('mecanismo_vinculacion')}>
            <option value="">Todos</option>
            <option value="AUTOMATICA">Automática</option>
            <option value="MANUAL">Manual</option>
            <option value="CORRECCION">Corrección</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="v-tel">ID lectura</label>
          <input id="v-tel" type="number" style={INPUT} value={value.id_telemetria} onChange={set('id_telemetria')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="v-infra">ID infraestructura</label>
          <input id="v-infra" type="number" style={INPUT} value={value.id_infraestructura} onChange={set('id_infraestructura')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="v-desde">Desde</label>
          <input id="v-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="v-hasta">Hasta</label>
          <input id="v-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')} />
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
