// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | PR-667: fechas en el día y la hora local del usuario, no en UTC |
// | 2026-10-29 | Arekkazu | TC-DIS-188 RF-67: el filtro de patología no aplica a un área POBLACIONAL (deshabilitado con motivo) |
// | 2026-11-03 | Arekkazu | RF-67: activo o lote con autocompletado (Combobox) en vez de una lista que crece sin fin |
import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, X } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Combobox } from '../../shared/design-system/Combobox';
import { etiquetaDeCatalogo, idDeCatalogo, resolverCatalogo } from '../../shared/lib/catalogo';
import { NIVEL_RIESGO_LABEL } from '../lib/riesgo';
import { INPUT, LABEL, FILTER_GRID } from './tableStyles';
import type { ActivoSelectorItem } from '../types';
import { diasAtrasLocal, hoyLocal } from '../../shared/lib/fecha';

export interface HistorialFiltrosState {
  /** Lo escrito en el campo; `idActivo` es el activo al que resuelve. */
  activo: string;
  idActivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  nivel_riesgo: string;
  id_patologia: string;
  incluir_alertas: boolean;
}

export function historialFiltrosVacio(): HistorialFiltrosState {
  return { activo: '', idActivo: '', fecha_inicio: diasAtrasLocal(30), fecha_fin: hoyLocal(), nivel_riesgo: '', id_patologia: '', incluir_alertas: false };
}

interface Props {
  value: HistorialFiltrosState;
  activos: ActivoSelectorItem[];
  activosError: boolean;
  patologias: { id: number; nombre: string }[];
  onChange: (v: HistorialFiltrosState) => void;
  onConsultar: () => void;
  onLimpiar: () => void;
  loading: boolean;
}

export function HistorialFiltros({ value, activos, activosError, patologias, onChange, onConsultar, onLimpiar, loading }: Props) {
  const { t } = useT('prediction');
  const set = <K extends keyof HistorialFiltrosState>(k: K, v: HistorialFiltrosState[K]) => onChange({ ...value, [k]: v });
  const errFechas = value.fecha_inicio && value.fecha_fin && value.fecha_inicio > value.fecha_fin;
  // TC-DIS-188: un área POBLACIONAL no tiene patología por animal; el filtro no aplica.
  const poblacional = activos.find((a) => String(a.id_activo_biologico) === String(value.idActivo))?.tipo === 'POBLACIONAL';
  // Mismo campo que el monitor de inferencias: se escribe, se filtra y se elige; también acepta el ID.
  const nombre = (a: ActivoSelectorItem) => a.identificador || `${a.tipo === 'POBLACIONAL' ? 'Lote' : 'Activo'} ${a.id_activo_biologico}`;
  const catalogo = activos.map((a) => ({ id: a.id_activo_biologico, nombre: nombre(a) }));
  const opciones = activos.map((a) => ({ valor: etiquetaDeCatalogo(nombre(a), a.id_activo_biologico), detalle: a.nombre_especie ?? undefined }));
  const [tocado, setTocado] = useState(false);
  const sinResolver = value.activo.trim() !== '' && value.idActivo === '';
  const resolver = () => {
    const r = resolverCatalogo(value.activo, catalogo);
    if (r.estado === 'resuelto') onChange({ ...value, activo: r.texto, idActivo: String(r.id) });
    setTocado(r.estado === 'sin_resolver');
  };

  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
      <div style={FILTER_GRID}>
        <Combobox
          id="hist-activo"
          label={t('historialfiltros.activo_lote')}
          required
          opciones={opciones}
          value={value.activo}
          onChange={(texto) => {
            const id = idDeCatalogo(texto, catalogo);
            onChange({ ...value, activo: texto, idActivo: id != null ? String(id) : '' });
            if (id != null || !texto.trim()) setTocado(false);
          }}
          onBlur={resolver}
          onEnter={resolver}
          error={tocado && sinResolver ? t('monitor.filtro_activo_sin_resolver') : undefined}
          placeholder={activosError ? t('historialfiltros.id_de_activo') : t('monitor.filtro_activo_placeholder')}
        />

        <div>
          <label style={LABEL} htmlFor="hist-desde">{t('historialfiltros.desde')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <input id="hist-desde" type="date" style={INPUT} value={value.fecha_inicio} max={value.fecha_fin || undefined} onChange={(e) => set('fecha_inicio', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-hasta">{t('historialfiltros.hasta')}<span aria-hidden style={{ color: 'var(--sem-error)' }}>*</span></label>
          <input id="hist-hasta" type="date" style={INPUT} value={value.fecha_fin} onChange={(e) => set('fecha_fin', e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-nivel">{t('historialfiltros.nivel_de_riesgo')}</label>
          <select id="hist-nivel" style={INPUT} value={value.nivel_riesgo} onChange={(e) => set('nivel_riesgo', e.target.value)}>
            <option value="">{t('historialfiltros.todos')}</option>
            {Object.entries(NIVEL_RIESGO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div>
          <label style={LABEL} htmlFor="hist-pat">{t('historialfiltros.patologia')}</label>
          <select
            id="hist-pat" style={INPUT} value={poblacional ? '' : value.id_patologia} onChange={(e) => set('id_patologia', e.target.value)}
            disabled={poblacional} aria-disabled={poblacional} aria-describedby={poblacional ? 'hist-pat-motivo' : undefined}
          >
            <option value="">{t('historialfiltros.todas')}</option>
            {patologias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          {poblacional && <p id="hist-pat-motivo" style={{ margin: 'var(--s1) 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{t('historialfiltros.patologia_no_aplica')}</p>}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', paddingBottom: 'var(--s2)' }}>
            <input type="checkbox" checked={value.incluir_alertas} onChange={(e) => set('incluir_alertas', e.target.checked)} style={{ accentColor: 'var(--brand-500)', width: 16, height: 16 }} />{t('historialfiltros.incluir_alertas')}</label>
        </div>
      </div>

      {errFechas && <p role="alert" style={{ margin: '0 0 var(--s2)', fontSize: '12px', color: 'var(--sem-error)' }}>{t('historialfiltros.la_fecha_inicial_no_puede_ser_posterior_a')}</p>}

      <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <X size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.limpiar')}</Button>
        <Button variant="primary" size="sm" loading={loading} disabled={!value.idActivo || !!errFechas} onClick={onConsultar}>
          <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('historialfiltros.consultar')}</Button>
      </div>
    </div>
  );
}
