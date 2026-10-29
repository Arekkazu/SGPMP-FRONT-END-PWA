// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-25 | Arekkazu | USAB-M03-M04 T-18/T-19: filtros de alertas por área, activo y tipo con nombre |
// | 2026-10-29 | Arekkazu | H-M3-05 CP31 RF-57: rango de fechas invertido se avisa en el campo y no se aplica |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo } from '../../shared/lib/catalogo';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { SelectorArea } from './SelectorArea';
import { etiquetaCodigo } from '../lib/etiquetaCodigo';
import type { AreaTelemetria } from '../hooks/useAreas';
import type { ActivoOpcionTelemetria } from '../api/alertasApi';

// T-19: el tipo era texto libre ("Ej: ESTRES_TERMICO"). modulo3.enum_tipo_alerta,
// sin TECNICA, que tiene su propia vista.
const TIPOS_ALERTA = [
  'ESTRES_TERMICO', 'SINDROME_RESPIRATORIO', 'RIESGO_HIDRICO', 'FIEBRE', 'INACTIVIDAD_ANORMAL',
  'FALLO_AMBIENTAL', 'PREDICCION_PATOLOGIA', 'TORMENTA_DE_ALERTAS', 'CONVERSION_ALIMENTICIA',
];

export interface AlertasFiltrosState {
  estado: string;
  severidad: string;
  origen_evento: string;
  tipo_alerta: string;
  /** T-18: área y activo se eligen por nombre; los id_* son lo que se envía. */
  id_infraestructura: string;
  area: string;
  id_activo_biologico: string;
  activo: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const ALERTAS_FILTROS_VACIO: AlertasFiltrosState = {
  estado: '', severidad: '', origen_evento: '', tipo_alerta: '',
  id_infraestructura: '', area: '', id_activo_biologico: '', activo: '', fecha_desde: '', fecha_hasta: '',
};

interface Props {
  areas?: AreaTelemetria[];
  activos?: ActivoOpcionTelemetria[];
  value: AlertasFiltrosState;
  onChange: (v: AlertasFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
  /**
   * Alertas técnicas: tipo fijo, y /iot/alertas-tecnicas no filtra por área ni por
   * activo (antes se mostraban esos campos y se ignoraban).
   */
  ocultarTipo?: boolean;
}

export function AlertasFiltros({ areas = [], activos = [], value, onChange, onAplicar, onLimpiar, ocultarTipo }: Props) {
  const invertido = !!value.fecha_desde && !!value.fecha_hasta && value.fecha_desde > value.fecha_hasta;
  const { t } = useT('telemetry');
  const nombreActivo = (a: ActivoOpcionTelemetria) => a.identificador || `${a.nombre_especie ?? ''} #${a.id_activo_biologico}`.trim();
  const catalogoActivos = activos.map((a) => ({ id: a.id_activo_biologico, nombre: nombreActivo(a) }));
  const opcionesActivos = activos.map((a) => ({ valor: etiquetaDeCatalogo(nombreActivo(a), a.id_activo_biologico), detalle: a.nombre_especie ?? undefined }));
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
            <select id="al-tipo" style={INPUT} value={value.tipo_alerta} onChange={set('tipo_alerta')}>
              <option value="">{t('alertasfiltros.todos')}</option>
              {TIPOS_ALERTA.map((c) => <option key={c} value={c}>{etiquetaCodigo(c)}</option>)}
            </select>
          </div>
        )}
        {!ocultarTipo && (
          <>
            <SelectorArea
              id="al-area"
              areas={areas}
              value={value.area}
              onChange={(area, id) => onChange({ ...value, area, id_infraestructura: id != null ? String(id) : '' })}
            />
            <Combobox
              id="al-activo"
              label={t('alertasfiltros.activo')}
              opciones={opcionesActivos}
              value={value.activo}
              onChange={(activo) => {
                const id = idDeCatalogo(activo, catalogoActivos);
                onChange({ ...value, activo, id_activo_biologico: id != null ? String(id) : '' });
              }}
              placeholder={t('selectorarea.placeholder')}
            />
          </>
        )}
        <div>
          <label style={LABEL} htmlFor="al-desde">{t('alertasfiltros.desde')}</label>
          <input id="al-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={set('fecha_desde')} />
        </div>
        <div>
          <label style={LABEL} htmlFor="al-hasta">{t('alertasfiltros.hasta')}</label>
          <input
            id="al-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={set('fecha_hasta')}
            aria-invalid={invertido} aria-describedby={invertido ? 'al-rango-error' : undefined}
          />
          {invertido && (
            <p id="al-rango-error" role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>
              {t('filtros.rango_invertido', { ns: 'common' })}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)', marginBottom: 'var(--s5)' }}>
        <Button variant="primary" size="sm" disabled={invertido} onClick={() => { if (!invertido) onAplicar(); }}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('alertasfiltros.aplicar_filtros')}</Button>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>{t('alertasfiltros.limpiar')}</Button>
      </div>
    </>
  );
}
