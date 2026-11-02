// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-29 | Arekkazu | TC-DIS-195 RF-73: columna ID de evento y filtros por actor y tipo de modelo |
// | 2026-10-31 | Arekkazu | RF-71/RF-73: filtro por solicitud de reentrenamiento |
// | 2026-11-02 | Arekkazu | AJF-13 RF-73: "Relacionado con" + "Registro" por nombre en vez del ID de referencia libre |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Filter, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import { TIPOS_MODELO, etiquetaTipoModelo } from '../types';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo, resolverCatalogo } from '../../shared/lib/catalogo';
import { ENTIDADES_REFERENCIA, type EntidadReferencia, type OpcionReferencia } from '../lib/referenciaAuditoria';

export interface AuditoriaFiltrosState {
  tipo_evento: string;
  severidad: string;
  /** AJF-13: qué tipo de cosa ("Relacionado con") y cuál ("Registro", por nombre). */
  entidad_referencia: EntidadReferencia | '';
  referencia: string;
  /** Id resuelto desde `referencia`; es lo que viaja al backend. */
  id_referencia: string;
  fecha_desde: string;
  fecha_hasta: string;
  /** ID de usuario (número) o identificador del sistema que originó el evento. */
  actor: string;
  tipo_modelo: string;
}

export const AUDITORIA_FILTROS_VACIO: AuditoriaFiltrosState = {
  tipo_evento: '', severidad: '', entidad_referencia: '', referencia: '', id_referencia: '', fecha_desde: '', fecha_hasta: '', actor: '', tipo_modelo: '',
};

// Optgroups del catálogo de tipos de evento (espeja el mockup RF-73).
const TIPOS_EVENTO: Record<string, { value: string; label: string }[]> = {
  Inferencia: [
    { value: 'INFERENCIA_EJECUTADA', label: 'Inferencia ejecutada' },
    { value: 'RIESGO_DETECTADO', label: 'Riesgo detectado' },
  ],
  Modelos: [
    { value: 'MODELO_REGISTRADO', label: 'Modelo registrado' },
    { value: 'MODELO_ACTIVADO', label: 'Modelo activado' },
    { value: 'NOTAS_REGISTRADAS', label: 'Notas registradas' },
    { value: 'REENTRENAMIENTO_SOLICITADO', label: 'Reentrenamiento solicitado' },
  ],
  Distribución: [
    { value: 'OTA_INICIADO', label: 'OTA iniciado' },
    { value: 'OTA_COMPLETADO', label: 'OTA completado' },
  ],
  Retroalimentación: [
    { value: 'RETROALIMENTACION_REGISTRADA', label: 'Retroalimentación registrada' },
  ],
  Configuración: [
    { value: 'MOTOR_CONFIGURADO', label: 'Motor configurado' },
    { value: 'PATOLOGIA_MODIFICADA', label: 'Patología modificada' },
  ],
};

interface Props {
  value: AuditoriaFiltrosState;
  onChange: (v: AuditoriaFiltrosState) => void;
  onAplicar: () => void;
  onLimpiar: () => void;
  /** Catálogo de la entidad elegida (lo carga la página). */
  opcionesReferencia?: OpcionReferencia[];
}

/** AJF-13: hay texto en "Registro" que no es una opción de la lista. */
export function referenciaSinResolver(v: AuditoriaFiltrosState): boolean {
  return !!v.entidad_referencia && v.referencia.trim() !== '' && v.id_referencia === '';
}

export function AuditoriaFiltros({ value, onChange, onAplicar, onLimpiar, opcionesReferencia = [] }: Props) {
  const { t } = useT('prediction');
  const set = <K extends keyof AuditoriaFiltrosState>(k: K, v: AuditoriaFiltrosState[K]) => onChange({ ...value, [k]: v });
  const [refTocada, setRefTocada] = useState(false);
  const sinResolver = referenciaSinResolver(value);
  const errorRef = refTocada && sinResolver ? t('referencia.sin_resolver') : undefined;
  const opcionesCombo = opcionesReferencia.map((o) => ({ valor: etiquetaDeCatalogo(o.nombre, o.id), detalle: o.detalle }));
  const resolverRef = () => {
    const r = resolverCatalogo(value.referencia, opcionesReferencia);
    if (r.estado === 'resuelto') onChange({ ...value, referencia: r.texto, id_referencia: String(r.id) });
    setRefTocada(r.estado === 'sin_resolver');
  };
  const aplicar = () => {
    if (sinResolver) { setRefTocada(true); return; }
    onAplicar();
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <div style={FILTER_GRID}>
        <div>
          <label style={LABEL} htmlFor="aud-tipo">{t('auditoriafiltros.tipo_de_evento')}</label>
          <select id="aud-tipo" style={INPUT} value={value.tipo_evento} onChange={(e) => set('tipo_evento', e.target.value)}>
            <option value="">{t('auditoriafiltros.todos')}</option>
            {Object.entries(TIPOS_EVENTO).map(([grupo, items]) => (
              <optgroup key={grupo} label={grupo}>
                {items.map((it) => <option key={it.value} value={it.value}>{it.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="aud-sev">{t('auditoriafiltros.severidad')}</label>
          <select id="aud-sev" style={INPUT} value={value.severidad} onChange={(e) => set('severidad', e.target.value)}>
            <option value="">{t('auditoriafiltros.todas')}</option>
            <option value="INFO">{t('auditoriafiltros.info')}</option>
            <option value="WARNING">{t('auditoriafiltros.warning')}</option>
            <option value="ERROR">{t('auditoriafiltros.error')}</option>
            <option value="CRITICAL">{t('auditoriafiltros.critico')}</option>
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="aud-actor">{t('auditoriafiltros.actor')}</label>
          <input id="aud-actor" style={INPUT} placeholder={t('auditoriafiltros.actor_ayuda')} value={value.actor} onChange={(e) => set('actor', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="aud-modelo">{t('auditoriafiltros.tipo_de_modelo')}</label>
          <select id="aud-modelo" style={INPUT} value={value.tipo_modelo} onChange={(e) => set('tipo_modelo', e.target.value)}>
            <option value="">{t('auditoriafiltros.todos')}</option>
            {TIPOS_MODELO.map((tm) => <option key={tm} value={tm}>{etiquetaTipoModelo(tm)}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="aud-entidad">{t('referencia.relacionado_con')}</label>
          <select
            id="aud-entidad" style={INPUT} value={value.entidad_referencia}
            onChange={(e) => { setRefTocada(false); onChange({ ...value, entidad_referencia: e.target.value as EntidadReferencia | '', referencia: '', id_referencia: '' }); }}
          >
            <option value="">{t('auditoriafiltros.todos')}</option>
            {ENTIDADES_REFERENCIA.map((en) => <option key={en} value={en}>{t(`referencia.opcion.${en}`)}</option>)}
          </select>
        </div>

        {value.entidad_referencia && (
          <Combobox
            id="aud-ref"
            label={t('referencia.registro')}
            opciones={opcionesCombo}
            value={value.referencia}
            onChange={(texto) => {
              const id = idDeCatalogo(texto, opcionesReferencia);
              onChange({ ...value, referencia: texto, id_referencia: id != null ? String(id) : '' });
              if (id != null || !texto.trim()) setRefTocada(false);
            }}
            onBlur={resolverRef}
            onEnter={resolverRef}
            error={errorRef}
            hint={t(`referencia.ayuda.${value.entidad_referencia}`)}
            placeholder={t('referencia.registro_placeholder')}
          />
        )}

        <div>
          <label style={LABEL} htmlFor="aud-desde">{t('auditoriafiltros.desde')}</label>
          <input id="aud-desde" type="date" style={INPUT} value={value.fecha_desde} onChange={(e) => set('fecha_desde', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="aud-hasta">{t('auditoriafiltros.hasta')}</label>
          <input id="aud-hasta" type="date" style={INPUT} value={value.fecha_hasta} onChange={(e) => set('fecha_hasta', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={() => { setRefTocada(false); onLimpiar(); }}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.limpiar')}</Button>
        <Button variant="secondary" size="sm" onClick={aplicar}>
          <Filter size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.aplicar')}</Button>
      </div>
    </div>
  );
}
