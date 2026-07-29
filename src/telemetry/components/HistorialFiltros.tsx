import React from 'react';
import { Search, Download } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

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

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export const HISTORIAL_FILTROS_DEFAULT: HistorialFiltrosState = {
  fecha_inicio: diasAtras(30),
  fecha_fin: hoy(),
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
  const set = (k: keyof HistorialFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  const aplicarRango = (n: number) => onChange({ ...value, fecha_inicio: diasAtras(n), fecha_fin: hoy() });

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        {RANGOS.map((n) => (
          <Button key={n} variant="ghost" size="sm" onClick={() => aplicarRango(n)}>Últimos {n} días</Button>
        ))}
      </div>

      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="h-desde">Desde *</label>
          <input id="h-desde" type="date" style={INPUT} value={value.fecha_inicio} onChange={set('fecha_inicio')} aria-required />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-hasta">Hasta *</label>
          <input id="h-hasta" type="date" style={INPUT} value={value.fecha_fin} onChange={set('fecha_fin')} aria-required />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-var">Variable</label>
          <input id="h-var" style={INPUT} placeholder="Ej: TEMPERATURA_AMBIENTAL" value={value.tipo_variable} onChange={set('tipo_variable')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-cat">Categoría</label>
          <select id="h-cat" style={INPUT} value={value.categoria_variable} onChange={set('categoria_variable')}>
            <option value="">Todas</option>
            <option value="AMBIENTAL">Ambiental</option>
            <option value="HIDRICA">Hídrica</option>
            <option value="ANIMAL">Animal</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-infra">ID infraestructura</label>
          <input id="h-infra" type="number" style={INPUT} value={value.id_infraestructura} onChange={set('id_infraestructura')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-esp">Especie</label>
          <input id="h-esp" style={INPUT} value={value.especie} onChange={set('especie')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-estado">Estado de la lectura</label>
          <select id="h-estado" style={INPUT} value={value.estado_dato} onChange={set('estado_dato')}>
            <option value="">Todas</option>
            <option value="LECTURA_VALIDA">Válidas</option>
            <option value="FUERA_DE_RANGO">Fuera de rango</option>
            <option value="ERROR_CALIBRACION">Error de calibración</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-origen">Origen del dato</label>
          <select id="h-origen" style={INPUT} value={value.origen_dato} onChange={set('origen_dato')}>
            <option value="">Todos</option>
            <option value="TIEMPO_REAL">Tiempo real</option>
            <option value="BUFFER_LOCAL">Desde buffer local</option>
            <option value="EDGE_AGREGADO">Edge agregado</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)', flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" onClick={onAplicar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Consultar
        </Button>
        {puedeExportar && (
          <Button variant="secondary" size="sm" onClick={onExportar}>
            <Download size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Exportar
          </Button>
        )}
      </div>
    </>
  );
}
