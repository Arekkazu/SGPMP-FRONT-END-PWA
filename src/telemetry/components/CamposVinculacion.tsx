// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M3-03 RF-61: activo candidato y modelo de manejo comunes a resolver y corregir |
import React from 'react';
import { useT } from '../../shared/i18n/useT';
import { Combobox } from '../../shared/design-system/Combobox';
import { INPUT, LABEL } from './tableStyles';
import { useCandidatosVinculacion } from '../hooks/useVinculaciones';

/** Acepta la opción elegida ("BOV-101 (#876)") o un ID escrito a mano; NaN si no hay ID. */
export function idDeTextoActivo(texto: string): number {
  const m = /^#?(\d+)$/.exec(texto.trim()) ?? /\(#(\d+)\)$/.exec(texto.trim());
  return Number(m?.[1] ?? NaN);
}

/** Texto inicial del campo para un activo ya vinculado. */
export const textoActivo = (id: number | null) => (id != null ? `#${id}` : '');

/**
 * M3-03: en vez de escribir el ID a mano, se elige entre los activos de la
 * infraestructura donde se tomó la lectura. Sin permiso para listarlos, el
 * campo sigue aceptando el ID escrito.
 */
export function CampoActivoCandidato({ id, idInfraestructura, value, onChange, error }: {
  id: string;
  idInfraestructura: number;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { t } = useT('telemetry');
  const candidatos = useCandidatosVinculacion(idInfraestructura);
  const opciones = candidatos.map((c) => ({
    valor: `${c.identificador ?? 'Activo'} (#${c.id_activo_biologico})`,
    detalle: c.tipo === 'POBLACIONAL' ? t('camposvinculacion.poblacional') : t('camposvinculacion.individual'),
  }));
  return (
    <Combobox
      id={id}
      label={t('camposvinculacion.activo_biologico')}
      opciones={opciones}
      value={value}
      onChange={onChange}
      required
      hint={candidatos.length > 0 ? t('camposvinculacion.candidatos_ayuda', { count: candidatos.length }) : t('camposvinculacion.sin_candidatos_ayuda')}
      error={error}
    />
  );
}

/**
 * M3-03: el modelo de manejo lo trae la vinculación (sale de la especie del área)
 * y se muestra en solo lectura; si llega vacío se elige de una lista cerrada.
 */
export function CampoModeloManejo({ id, fijo, value, onChange, error }: {
  id: string;
  fijo: string | null;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { t } = useT('telemetry');
  const etiqueta = (m: string) => (m === 'POBLACIONAL' ? t('camposvinculacion.poblacional') : t('camposvinculacion.individual'));
  return (
    <div>
      <label style={LABEL} htmlFor={id}>{t('camposvinculacion.modelo_de_manejo')}</label>
      {fijo ? (
        <p id={id} style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{etiqueta(fijo)}</p>
      ) : (
        <select id={id} style={{ ...INPUT, borderColor: error ? 'var(--sem-error)' : 'var(--surface-border)' }} value={value} onChange={(e) => onChange(e.target.value)} aria-required aria-invalid={!!error}>
          <option value="">—</option>
          <option value="INDIVIDUAL">{etiqueta('INDIVIDUAL')}</option>
          <option value="POBLACIONAL">{etiqueta('POBLACIONAL')}</option>
        </select>
      )}
      {error && <p role="alert" style={{ fontSize: '12px', color: 'var(--sem-error)', margin: 'var(--s1) 0 0' }}>{error}</p>}
    </div>
  );
}
