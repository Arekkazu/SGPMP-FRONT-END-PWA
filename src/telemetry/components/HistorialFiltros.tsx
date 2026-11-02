// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-01/M3-13 RF-59: 7 días por defecto, rangos rápidos consultan, exportación deshabilitada con motivo |
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18: área por nombre en vez de «ID infraestructura» |
// | 2026-10-29 | Arekkazu | H-M3-03 CP15 RF-59: Desde/Hasta vacías o invertidas se avisan en español antes de consultar |
// | 2026-10-31 | Arekkazu | USAB-M03-M04 T-19 RF-59: variable elegida de una lista con nombres |
// | 2026-11-02 | Arekkazu | AJF-05 RF-59: los filtros que no se pueden combinar se deshabilitan con el motivo visible |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, Download } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';
import { SelectorArea } from './SelectorArea';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import type { AreaTelemetria } from '../hooks/useAreas';
import { combinacionValida, companerosPosibles, filtroPermitido, type FiltroHistorial } from '../lib/combinacionesHistorial';

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

/** Códigos de telemetría del catálogo de M09 (`codigo_telemetria`) que acepta el historial. */
const VARIABLES_TELEMETRIA = [
  'TEMPERATURA_AMBIENTAL', 'HUMEDAD_RELATIVA', 'NH3', 'CO2', 'PH_AGUA', 'OXIGENO_DISUELTO', 'TDS',
  'TEMP_CORPORAL', 'FRECUENCIA_CARDIACA', 'FRECUENCIA_RESPIRATORIA', 'ACTIVIDAD',
];

/** AJF-05: filtros de esta pantalla con el nombre que usa la regla de combinaciones. */
const EN_PANTALLA: FiltroHistorial[] = ['tipo_variable', 'categoria_variable', 'id_unidad_productiva', 'especie', 'estado_dato', 'origen_dato'];

export function filtrosElegidos(v: HistorialFiltrosState): Set<FiltroHistorial> {
  const s = new Set<FiltroHistorial>();
  if (v.tipo_variable) s.add('tipo_variable');
  if (v.categoria_variable) s.add('categoria_variable');
  if (v.id_infraestructura) s.add('id_unidad_productiva');
  if (v.especie.trim()) s.add('especie');
  if (v.estado_dato) s.add('estado_dato');
  if (v.origen_dato) s.add('origen_dato');
  return s;
}

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
  // AJF-05: la regla 12 de RF-59 solo admite ciertas combinaciones; los filtros que ya
  // no se pueden sumar a lo elegido se deshabilitan con el motivo visible.
  const elegidos = filtrosElegidos(value);
  const nombre: Record<FiltroHistorial, string> = {
    tipo_variable: t('historialfiltros.variable'),
    categoria_variable: t('historialfiltros.categoria'),
    id_unidad_productiva: t('selectorarea.area'),
    especie: t('historialfiltros.especie'),
    estado_dato: t('historialfiltros.estado_de_la_lectura'),
    origen_dato: t('historialfiltros.origen_del_dato'),
    sensor_id: t('historialfiltros.sensor'),
    id_activo_biologico: t('historialfiltros.activo'),
  };
  const bloqueado = (f: FiltroHistorial) => !filtroPermitido(f, elegidos);
  const hayBloqueados = EN_PANTALLA.some(bloqueado);
  const lista = (fs: FiltroHistorial[]) => fs.map((f) => nombre[f].toLowerCase()).join(', ');
  const companeros = companerosPosibles(elegidos, EN_PANTALLA);
  const elegidosTexto = [...elegidos].map((f) => nombre[f]).join(' + ');
  const motivo = !hayBloqueados ? '' : companeros.length
    ? t('historialfiltros.combinacion_solo_con', { elegidos: elegidosTexto, otros: lista(companeros) })
    : t('historialfiltros.combinacion_ninguno', { elegidos: elegidosTexto });
  const combinacionInvalida = !combinacionValida(elegidos);
  const describe = (f: FiltroHistorial) => (bloqueado(f) ? 'h-combinacion-motivo' : undefined);

  const consultar = () => {
    setIntento(true);
    if (!faltan && !invertido && !combinacionInvalida) onAplicar();
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
          {/* T-19: lista con nombres en vez de pedir escribir "TEMPERATURA_AMBIENTAL". */}
          <select id="h-var" style={INPUT} value={value.tipo_variable} onChange={set('tipo_variable')} disabled={bloqueado('tipo_variable')} aria-describedby={describe('tipo_variable')}>
            <option value="">{t('historialfiltros.todas_las_variables')}</option>
            {VARIABLES_TELEMETRIA.map((v) => <option key={v} value={v}>{etiquetaCodigo(v)}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-cat">{t('historialfiltros.categoria')}</label>
          <select id="h-cat" style={INPUT} value={value.categoria_variable} onChange={set('categoria_variable')} disabled={bloqueado('categoria_variable')} aria-describedby={describe('categoria_variable')}>
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
          disabled={bloqueado('id_unidad_productiva')}
          hint={bloqueado('id_unidad_productiva') ? motivo : undefined}
        />
        <div>
          <label style={LABEL} htmlFor="h-esp">{t('historialfiltros.especie')}</label>
          <input id="h-esp" style={INPUT} value={value.especie} onChange={set('especie')} disabled={bloqueado('especie')} aria-describedby={describe('especie')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="h-estado">{t('historialfiltros.estado_de_la_lectura')}</label>
          <select id="h-estado" style={INPUT} value={value.estado_dato} onChange={set('estado_dato')} disabled={bloqueado('estado_dato')} aria-describedby={describe('estado_dato')}>
            <option value="">{t('historialfiltros.todas')}</option>
            <option value="LECTURA_VALIDA">{t('historialfiltros.validas')}</option>
            <option value="FUERA_DE_RANGO">{t('historialfiltros.fuera_de_rango')}</option>
            <option value="ERROR_CALIBRACION">{t('historialfiltros.error_de_calibracion')}</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="h-origen">{t('historialfiltros.origen_del_dato')}</label>
          <select id="h-origen" style={INPUT} value={value.origen_dato} onChange={set('origen_dato')} disabled={bloqueado('origen_dato')} aria-describedby={describe('origen_dato')}>
            <option value="">{t('historialfiltros.todos')}</option>
            <option value="TIEMPO_REAL">{t('historialfiltros.tiempo_real')}</option>
            <option value="BUFFER_LOCAL">{t('historialfiltros.desde_buffer_local')}</option>
            <option value="EDGE_AGREGADO">{t('historialfiltros.edge_agregado')}</option>
          </select>
        </div>
      </div>

      {motivo && (
        <p id="h-combinacion-motivo" style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 var(--s3)' }}>{motivo}</p>
      )}
      {intento && combinacionInvalida && (
        <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: '0 0 var(--s3)' }}>{t('historialfiltros.combinacion_invalida')}</p>
      )}
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
