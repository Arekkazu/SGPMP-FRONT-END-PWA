// | Fecha      | Nombre   | Que se hizo                                                                  |
// |------------|----------|------------------------------------------------------------------------------|
// | 2026-11-19 | Arekkazu | M08 RF-104: vista previa con la estructura de las plantillas V1.1 del reporte |
import React from 'react';
import { Alert } from '../../shared/design-system/Alert';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import type { VistaPrevia } from '../tipos';
import { TablaReporte, celda } from './TablaReporte';

// Datos del titular que van en una sola fila bajo el título; el resto (exportación, área) va en el recuadro gris.
const EN_FILA = ['Razón social', 'NIT', 'Finca', 'Rango de fechas', 'Período contable', 'Período base',
  'Período de comparación', 'Fecha de corte'];
const SUBTITULO: React.CSSProperties = { margin: 'var(--s5) 0 var(--s3)', fontSize: 'var(--fs-body-lg, 16px)' };
const SECUNDARIO: React.CSSProperties = { color: 'var(--text-secondary)' };
const RECUADRO: React.CSSProperties = {
  background: 'var(--surface-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-md)',
  padding: 'var(--s3) var(--s4)', margin: 'var(--s3) 0',
};

/**
 * Lo mismo que trae el PDF, en el mismo orden: autor, datos del titular, parámetros de selección, avisos,
 * análisis detallado, tarjetas de «Resumen ejecutivo de indicadores» y las tablas finales.
 */
export function VistaPreviaReporte({ previa }: { previa: VistaPrevia }) {
  const { t } = useT('reportes');
  const fecha = previa.encabezado.find((e) => e.dato === 'Fecha de generación')?.valor;
  const enFila = previa.encabezado.filter((e) => EN_FILA.includes(e.dato));
  const aparte = previa.encabezado.filter((e) => !EN_FILA.includes(e.dato) && e.dato !== 'Fecha de generación');
  const titulosResumen = new Set(previa.resumen.map((x) => x.titulo));
  const finales = previa.finales.filter((x) => !titulosResumen.has(x.titulo));
  return (
    <>
      <h2 id="titulo-previa" style={{ margin: '0 0 var(--s1)', fontSize: 'var(--fs-title-sm, 18px)' }}>
        {t('previa.titulo', { titulo: previa.titulo })}
      </h2>
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s3)' }}>
        {[fecha && t('previa.fecha', { fecha }), previa.generado_por && t('previa.generado_por', { nombre: previa.generado_por }),
          t('previa.estado')].filter(Boolean).join(' · ')}
      </p>
      <dl style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2) var(--s5)', margin: 0 }}>
        {enFila.map((e) => (
          <div key={e.dato} style={{ display: 'flex', gap: 'var(--s2)' }}>
            <dt style={SECUNDARIO}>{e.dato === 'Rango de fechas' ? t('previa.periodo') : e.dato}</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{e.valor}</dd>
          </div>
        ))}
      </dl>
      {aparte.length > 0 && (
        <dl className="ds-fg3" style={RECUADRO}>
          {aparte.map((e) => (
            <div key={e.dato}><dt style={SECUNDARIO}>{e.dato}</dt><dd style={{ margin: 0 }}>{e.valor}</dd></div>
          ))}
        </dl>
      )}
      {previa.aclaraciones.map((a) => <p key={a} style={{ ...RECUADRO, ...SECUNDARIO }}>{a}</p>)}

      {(previa.parametros ?? []).length > 0 && (
        <>
          <h3 style={SUBTITULO}>{t('previa.parametros')}</h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--s5)' }}>
            {previa.parametros!.map((p) => (
              <li key={p.dato} style={{ padding: 'var(--s1) 0', borderBottom: '1px solid var(--surface-border)' }}>
                <span style={SECUNDARIO}>{p.dato}:</span> <strong>{p.valor}</strong>
              </li>
            ))}
          </ul>
        </>
      )}

      {previa.sin_datos ? (
        <div style={{ marginTop: 'var(--s4)' }}>
          <Alert variant="info" title={t('previa.sin_datos')} description={previa.mensaje ?? undefined} />
        </div>
      ) : (
        <>
          {previa.advertencias.map((a) => (
            <div key={a} style={{ marginTop: 'var(--s3)' }}><Alert variant="warning" title={t('previa.advertencia')} description={a} /></div>
          ))}
          <p role="status" style={{ fontWeight: 600, marginTop: 'var(--s4)' }}>
            {t('previa.registros', { count: previa.numero_registros, registros: formatearNumero(previa.numero_registros) })}
          </p>
          {previa.en_segundo_plano && (
            <Alert variant="info" title={t('previa.segundo_plano')} description={t('previa.segundo_plano_detalle')} />
          )}
          {previa.detalle && (
            <>
              <h3 style={SUBTITULO}>{t('previa.analisis')}</h3>
              <TablaReporte tabla={previa.detalle} sinTitulo />
            </>
          )}
          {previa.secciones.map((s) => (
            <div key={s.titulo}>
              <h3 style={SUBTITULO}>{s.titulo}</h3>
              {s.textos.map((x) => <p key={x}>{x}</p>)}
              {s.tablas.map((tabla) => <TablaReporte key={tabla.titulo} tabla={tabla} sinTitulo={s.tablas.length === 1} />)}
            </div>
          ))}
          {(previa.indicadores ?? []).length > 0 && (
            <>
              <h3 style={SUBTITULO}>{t('previa.indicadores')}</h3>
              <ul className="ds-fg3" style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--s4)' }}>
                {previa.indicadores!.map((i) => (
                  <li key={i.etiqueta} style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)',
                    padding: 'var(--s3) var(--s4)', background: 'var(--surface-card)' }}>
                    <span style={{ ...SECUNDARIO, display: 'block', fontSize: 'var(--fs-label-md)', textTransform: 'uppercase' }}>
                      {i.etiqueta}
                    </span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-600)', fontSize: 'var(--fs-body-lg, 16px)' }}>
                      {celda(i.valor, i.tipo, t('previa.sin_dato'))}
                    </strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          {[...previa.resumen, ...finales].map((tabla) => <TablaReporte key={tabla.titulo} tabla={tabla} />)}
        </>
      )}
    </>
  );
}
