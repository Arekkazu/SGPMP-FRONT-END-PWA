import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Filter, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';

export interface AuditoriaFiltrosState {
  tipo_evento: string;
  severidad: string;
  id_referencia: string;
  fecha_desde: string;
  fecha_hasta: string;
}

export const AUDITORIA_FILTROS_VACIO: AuditoriaFiltrosState = {
  tipo_evento: '', severidad: '', id_referencia: '', fecha_desde: '', fecha_hasta: '',
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
}

export function AuditoriaFiltros({ value, onChange, onAplicar, onLimpiar }: Props) {
  const { t } = useT('prediction');
  const set = <K extends keyof AuditoriaFiltrosState>(k: K, v: AuditoriaFiltrosState[K]) => onChange({ ...value, [k]: v });

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
          <label style={LABEL} htmlFor="aud-ref">{t('auditoriafiltros.id_de_referencia')}</label>
          <input id="aud-ref" style={INPUT} placeholder={t('auditoriafiltros.entidad_referenciada')} value={value.id_referencia} onChange={(e) => set('id_referencia', e.target.value)} />
        </div>

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
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.limpiar')}</Button>
        <Button variant="secondary" size="sm" onClick={onAplicar}>
          <Filter size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.aplicar')}</Button>
      </div>
    </div>
  );
}
