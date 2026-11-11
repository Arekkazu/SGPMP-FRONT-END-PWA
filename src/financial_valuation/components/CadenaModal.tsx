// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-91 prototipo: cadena de trazabilidad de una línea, compartida por variaciones y trazabilidad |
// | 2026-11-10 | Arekkazu | TC-DIS-254/255 RF-91: cadena ordenada por nivel, eslabones expandibles con su identificador y el fallo con nivel y motivo |
import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, CircleAlert, MinusCircle } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import type { Cadena } from '../types';
import { Datos, EstadoBadge, ErrorApi, SECUNDARIO, Subtitulo, formatoMoneda, useAsync } from './comunes';

/** Los 4 niveles de RF-91, en el orden de lectura: dato físico → evento → variación/precio → asiento. */
const NIVELES: Array<{ nivel: number; eslabones: string[] }> = [
  { nivel: 1, eslabones: ['lecturas_nic41'] },
  { nivel: 2, eslabones: ['evento_m02', 'evento_sanitario'] },
  { nivel: 3, eslabones: ['precio_documentado', 'origen'] },
  { nivel: 4, eslabones: ['cierre'] },
];
/** Motivo típico cuando el eslabón falla (RF-91 FA-1 / FA-2). */
const MOTIVO_FALLO: Record<string, string> = {
  lecturas_nic41: 'motivo_lecturas', precio_documentado: 'motivo_precio', evento_m02: 'motivo_evento', evento_sanitario: 'motivo_sanitario',
  origen: 'motivo_origen', cierre: 'motivo_cierre',
};

type Estado = 'ok' | 'falta' | 'no_aplica';

function estadoDe(valor: unknown): Estado {
  if (valor === null || valor === undefined) return 'no_aplica';
  if (valor === false) return 'falta';
  return 'ok';
}

/** Identificadores de negocio que el backend adjunta al eslabón (ids, tabla de origen, conteos). */
function detalleDe(valor: unknown, ids: Record<string, unknown>, clave: string): string[] {
  const partes: string[] = [];
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) if (v !== null && typeof v !== 'object') partes.push(`${k.replace(/_/g, ' ')}: ${String(v)}`);
  }
  const propios: Record<string, string[]> = {
    evento_m02: ['id_evento'], origen: ['id_variacion_valor_razonable', 'id_origen'], precio_documentado: ['id_precio', 'id_precio_mercado'],
    lecturas_nic41: ['ids_telemetria', 'lecturas'], cierre: ['id_comprobante', 'id_comprobante_nic41'], evento_sanitario: ['id_evento_sanitario'],
  };
  for (const k of propios[clave] ?? []) {
    const v = ids[k];
    if (v !== undefined && v !== null && !partes.some((p) => p.startsWith(k.replace(/_/g, ' ')))) partes.push(`${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
  }
  return partes;
}

function numeroNivel(n: string | number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  const m = String(n).match(/\d+/);
  return m ? Number(m[0]) : null;
}

interface Props {
  idLinea: number;
  titulo: string;
  /** Individual o poblacional: la cadena identifica a qué clase de entidad pertenece. */
  tipoActivo?: string | null;
  onCerrar: () => void;
}

export function CadenaModal({ idLinea, titulo, tipoActivo, onCerrar }: Props) {
  const { t } = useT('finanzas');
  const cadena = useAsync(finanzasApi.cadena);
  const { ejecutar } = cadena;
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  useEffect(() => { ejecutar(idLinea); }, [idLinea, ejecutar]);
  const c = cadena.data;
  const eslabones = (c?.eslabones ?? {}) as Record<string, unknown>;
  const ids = (eslabones.ids ?? {}) as Record<string, unknown>;
  const faltantes = new Set(c?.eslabones_faltantes ?? []);
  const nivelFallo = numeroNivel(c?.nivel_fallo);
  const manual = c?.tipo_evidencia === 'REGISTRO_MANUAL';

  const estadoEslabon = (k: string): Estado => (faltantes.has(k) ? 'falta' : estadoDe(eslabones[k]));
  // Un nivel «aplica» si alguno de sus eslabones viene en la cadena; el Nivel 1 de un registro manual no se exige (FA-3).
  const filaNivel = (nivel: number, claves: string[]) => {
    const presentes = claves.filter((k) => k in eslabones);
    if (presentes.length === 0) return { estado: 'no_aplica' as Estado, claves: [] as string[] };
    const estados = presentes.map(estadoEslabon);
    const estado: Estado = estados.includes('falta') ? 'falta' : estados.includes('ok') ? 'ok' : 'no_aplica';
    return { estado, claves: presentes };
  };

  const ICONO: Record<Estado, React.ReactNode> = {
    ok: <CheckCircle2 size={16} aria-hidden style={{ color: 'var(--sem-success)' }} />,
    falta: <CircleAlert size={16} aria-hidden style={{ color: 'var(--sem-error)' }} />,
    no_aplica: <MinusCircle size={16} aria-hidden style={{ color: 'var(--text-muted)' }} />,
  };

  return (
    <ModalShell title={t('cierre.cadena_titulo', { linea: titulo })} onClose={onCerrar} maxWidth={600}
      footer={<Button variant="secondary" size="md" onClick={onCerrar}>{t('comun.cerrar')}</Button>}>
      <ErrorApi error={cadena.error} />
      {!c && cadena.cargando && <p style={SECUNDARIO}>{t('comun.cargando')}</p>}
      {c && (
        <>
          <Datos filas={[
            [t('col.tipo_hecho'), t(`hecho.${c.tipo_hecho}`)], [t('col.valor'), formatoMoneda(c.valor)],
            [t('col.evidencia'), t(`evidencia.${c.tipo_evidencia}`, { defaultValue: t('evidencia.REGISTRO_MANUAL') })],
            [t('cadena.entidad'), tipoActivo ? t(`cadena.tipo_${tipoActivo}`, { defaultValue: tipoActivo }) : t('traza.sin_activo')],
            [t('col.trazabilidad'), <EstadoBadge key="e" estado={c.estado_trazabilidad} />],
          ]} />
          {c.estado_trazabilidad === 'PENDIENTE_TRAZABILIDAD' && (
            <Alert variant="warning" style={{ marginTop: 'var(--s4)' }}
              title={nivelFallo ? t('cadena.fallo_nivel', { nivel: nivelFallo, nombre: t(`cadena.nivel_${nivelFallo}`) }) : t('cierre.faltantes')}
              description={[...faltantes].map((f) => `${t(`eslabon.${f}`, { defaultValue: t('cierre.eslabon_otro') })}: ${t(`cadena.${MOTIVO_FALLO[f] ?? 'motivo_generico'}`)}`).join(' · ')} />
          )}
          <Subtitulo>{t('cierre.eslabones')}</Subtitulo>
          <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>{t('cadena.ayuda')}</p>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s2)' }}>
            {NIVELES.map(({ nivel, eslabones: claves }) => {
              const fila = filaNivel(nivel, claves);
              const noRequerido = nivel === 1 && manual;
              const abierto = !!abiertos[nivel];
              const detalles = fila.claves.flatMap((k) => {
                const partes = detalleDe(eslabones[k], ids, k);
                const estado = estadoEslabon(k);
                const texto = estado === 'ok' ? t('cierre.eslabon_ok') : estado === 'falta' ? t('cierre.eslabon_falta') : t('cadena.no_aplica');
                return [`${t(`eslabon.${k}`)}: ${texto}${partes.length ? ` (${partes.join(' · ')})` : ''}`];
              });
              const estadoTexto = noRequerido ? t('cadena.no_requerido')
                : fila.estado === 'ok' ? t('cadena.completo') : fila.estado === 'falta' ? t('cadena.incompleto') : t('cadena.no_aplica');
              return (
                <li key={nivel} style={{ border: '1px solid var(--surface-border)', borderLeft: `4px solid ${fila.estado === 'falta' && !noRequerido ? 'var(--sem-error)' : fila.estado === 'ok' ? 'var(--sem-success)' : 'var(--surface-border)'}`, borderRadius: 'var(--r-md)' }}>
                  <button type="button" className="fin-eslabon" aria-expanded={abierto} aria-controls={`cadena-nivel-${nivel}`}
                    onClick={() => setAbiertos((a) => ({ ...a, [nivel]: !a[nivel] }))}>
                    {abierto ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
                    {noRequerido ? ICONO.no_aplica : ICONO[fila.estado]}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong>{t('cadena.nivel', { nivel })} · {t(`cadena.nivel_${nivel}`)}</strong>
                      <span className="fin-secundario">{estadoTexto}{nivelFallo === nivel && !noRequerido ? ` · ${t('cadena.aqui_fallo')}` : ''}</span>
                    </span>
                  </button>
                  <div id={`cadena-nivel-${nivel}`} hidden={!abierto} style={{ padding: '0 var(--s4) var(--s3) var(--s8)' }}>
                    {noRequerido ? <p style={{ ...SECUNDARIO, margin: 0 }}>{t('cadena.no_requerido_detalle')}</p>
                      : detalles.length === 0 ? <p style={{ ...SECUNDARIO, margin: 0 }}>{t('cadena.sin_detalle')}</p>
                        : <ul style={{ margin: 0, paddingLeft: 'var(--s4)', fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)' }}>{detalles.map((d) => <li key={d}>{d}</li>)}</ul>}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </ModalShell>
  );
}

export type { Cadena };
