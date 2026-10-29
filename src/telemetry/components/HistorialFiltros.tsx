// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-01/M3-13 RF-59: 7 días por defecto, rangos rápidos consultan, exportación deshabilitada con motivo |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre en vez de «ID infraestructura» |
// | 2026-10-29 | Arekkazu | H-M3-03 CP15 RF-59: Desde/Hasta vacías o invertidas se avisan en español antes de consultar |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, Download } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';
import { SelectorArea } from './SelectorArea';
import type { AreaTelemetria } from '../hooks/useAreas';

export interface HistorialFiltrosState {
  fecha_inicio: string;   // yyyy-mm-dd (requerido)
  fecha_fin: string;      // yyyy-mm-dd (requerido)
  tipo_variable: string;
  categoria_variable: string;
  /** ID que se envía; `area` es el texto del Combobox (T-18). */
  id_infraestructura: string;
  area: string;
  especie: string;
  estado_dato: string;
  origen_dato: string;
}


// M3-01: con 30 días el backend respondía 422 VOLUMEN_EXCESIVO en fincas con
// muchos sensores, justo en la primera carga. 7 días cabe en el límite.
export const HISTORIAL_FILTROS_DEFAULT: HistorialFiltrosState = {
  fecha_inicio: diasAtrasLocal(7),
  fecha_fin: hoyLocal(),
  tipo_variable: '', categoria_variable: '', id_infraestructura: '', area: '', especie: '',
  estado_dato: '', origen_dato: '',
};

const RANGOS = [7, 30, 60, 90];

interface Props {
  areas: AreaTelemetria[];
  value: HistorialFiltrosState;
  onChange: (v: HistorialFiltrosState) => void;
  /** Con `v`, consulta con esos filtros (los rangos rápidos no esperan al re-render). */
  onAplicar: (v?: HistorialFiltrosState) => void;
  onExportar: () => void;
  puedeExportar: boolean;
}

export function HistorialFiltros({ areas, value, onChange, onAplicar, onExportar, puedeExportar }: Props) {
  const { t } = useT('telemetry');
  const set = (k: keyof HistorialFiltrosState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  // H-M3-03: el 422 del backend por fecha vacía llegaba con el texto técnico en inglés.
  const [intento, setIntento] = useState(false);
  const faltan = !value.fecha_inicio || !value.fecha_fin;
  const invertido = !faltan && value.fecha_inicio > value.fecha_fin;
  const errorFechas = intento && (faltan || invertido);
  const consultar = () => {
    setIntento(true);
    if (!faltan && !invertido) onAplicar();
  };

  // M3-01: el rango rápido también consulta; antes solo cambiaba las fechas.
  const aplicarRango = (n: number) => {
    const v = { ...value, fecha_inicio: diasAtrasLocal(n), fecha_fin: hoyLocal() };
    onChange(v);
    onAplicar(v);
  };

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
          <input id="h-desde" type="date" style={INPUT} value={value.fecha_inicio} onChange={set('fecha_inicio')} aria-required aria-invalid={errorFechas} aria-describedby={errorFechas ? 'h-fechas-error' : undefined} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-hasta">{t('historialfiltros.hasta')}</label>
          <input id="h-hasta" type="date" style={INPUT} value={value.fecha_fin} onChange={set('fecha_fin')} aria-required aria-invalid={errorFechas} aria-describedby={errorFechas ? 'h-fechas-error' : undefined} />
          {errorFechas && (
            <p id="h-fechas-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
              {invertido ? t('filtros.rango_invertido', { ns: 'common' }) : t('filtros.fechas_obligatorias', { ns: 'common' })}
            </p>
          )}
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
        <SelectorArea
          id="h-infra"
          areas={areas}
          value={value.area}
          onChange={(area, idArea) => onChange({ ...value, area, id_infraestructura: idArea != null ? String(idArea) : '' })}
        />
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
        <Button variant="primary" size="sm" onClick={consultar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.consultar')}</Button>
        {puedeExportar && (
          // M3-13: el backend responde siempre 503 hasta que exista el módulo de Reportes
          // (M08). El motivo va en texto visible; un `title` en un botón deshabilitado no se ve.
          // ponytail: deshabilitado fijo; habilitar cuando M08 exponga la exportación.
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={onExportar} disabled aria-describedby="h-exportar-motivo">
              <Download size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.exportar')}</Button>
            <span id="h-exportar-motivo" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('historialfiltros.exportar_no_disponible')}</span>
          </span>
        )}
      </div>
    </>
  );
}
