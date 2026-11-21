// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-97 / RF-AE02 5.10: vista previa del documento contable que recibe AgroFusion |
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-97: el NIT se elige entre los titulares de las fincas del usuario |
// | 2026-11-19 | Arekkazu | M7-01/M7-05 RF-AE01: sin documento anterior tras un rechazo, titular visible y períodos consultables |
// | 2026-11-20 | Arekkazu | A11Y-M07 RF-AE01: tabla de documentos en ScrollRegion |
import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSearch } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../../financial_valuation/api/finanzasApi';
import { ErrorApi, EstadoVacio, EncabezadoVista, PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM, formatoFecha, formatoMoneda, guardarArchivo, nombrePeriodo, useAsync } from '../../financial_valuation/components/comunes';
import { integracionApi } from '../api/integracionApi';
import { ACCION_R, R_EXPORTACION } from '../rbac';
import { SelectorTitular } from '../../shared/fincas/SelectorTitular';
import { useMisFincas } from '../../shared/fincas/useMisFincas';

const R_CIERRE = 'cierre_periodo';

export function VistaPreviaView() {
  const { t } = useT('integracion');
  const puedeLeer = usePermissionPorNombre(R_EXPORTACION, ACCION_R);
  const puedeVerPeriodos = usePermissionPorNombre(R_CIERRE, ACCION_R);
  const periodos = useAsync(finanzasApi.periodos);
  const vista = useAsync(integracionApi.vistaPrevia);
  const [nit, setNitEstado] = useState('');
  const [desde, setDesdeEstado] = useState('');
  const [hasta, setHastaEstado] = useState('');
  const [consultado, setConsultado] = useState('');
  const { fincas } = useMisFincas();
  // Razón social de cada titular de las fincas del usuario: solo esos períodos se pueden consultar (M7-05).
  const razones = useMemo(() => new Map(fincas.filter((f) => f.numero_id_tributaria)
    .map((f) => [f.numero_id_tributaria as string, f.razon_social])), [fincas]);
  const { ejecutar: cargarPeriodos } = periodos;
  const { limpiar: limpiarVista } = vista;
  // M7-01: el documento en pantalla es siempre el de la consulta actual; si cambia algo, se quita.
  const setNit = (v: string) => { setNitEstado(v); limpiarVista(); };
  const setDesde = (v: string) => { setDesdeEstado(v); limpiarVista(); };
  const setHasta = (v: string) => { setHastaEstado(v); limpiarVista(); };
  useEffect(() => { if (puedeLeer && puedeVerPeriodos) cargarPeriodos(); }, [puedeLeer, puedeVerPeriodos, cargarPeriodos]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.documento')} />;
  const cerrados = (periodos.data ?? []).filter((p) => p.estado === 'CERRADO' && p.numero_id_tributaria
    && razones.has(p.numero_id_tributaria));
  const completo = /^\d{6,15}$/.test(nit) && desde && hasta;
  const env = vista.data?.envelope;

  return (
    <>
      <EncabezadoVista titulo={t('documento.titulo')} descripcion={t('documento.descripcion')} />
      <section style={{ ...PANEL, marginBottom: 'var(--s5)' }} aria-label={t('documento.consulta')}>
        {cerrados.length > 0 && (
          <Select label={t('documento.periodo_cerrado')} value="" onChange={(e) => {
            const p = cerrados.find((x) => String(x.id_periodo_contable) === e.target.value);
            if (p) { setNit(p.numero_id_tributaria); setDesde(p.fecha_inicio); setHasta(p.fecha_fin); }
          }}>
            <option value="">{t('documento.elegir_periodo')}</option>
            {cerrados.map((p) => (
              <option key={p.id_periodo_contable} value={p.id_periodo_contable}>
                {t('documento.opcion_periodo', { periodo: nombrePeriodo(p), nit: p.numero_id_tributaria,
                  titular: razones.get(p.numero_id_tributaria) ?? t('documento.sin_razon_social') })}
              </option>
            ))}
          </Select>
        )}
        <div style={{ display: 'grid', gap: 'var(--s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: 'var(--s4)' }}>
          <SelectorTitular id="doc-nit" label={t('documento.nit')} hint={t('documento.nit_ayuda')} value={nit} onChange={setNit} required />
          <Input label={t('documento.desde')} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
          <Input label={t('documento.hasta')} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        </div>
        <div style={{ display: 'flex', gap: 'var(--s3)', marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
          <Button variant="primary" size="md" disabled={!completo} loading={vista.cargando} onClick={() => { vista.limpiar(); setConsultado(nit); vista.ejecutar(nit, desde, hasta); }}>
            <FileSearch size={18} aria-hidden />{t('documento.generar')}
          </Button>
          {vista.data && !vista.error && (
            <Button variant="secondary" size="md" onClick={() => guardarArchivo(
              new Blob([vista.data!.texto], { type: 'application/json' }), `documento_contable_${nit}_${desde}_${hasta}.json`)}>
              <Download size={18} aria-hidden />{t('documento.descargar')}
            </Button>
          )}
        </div>
      </section>
      <ErrorApi error={vista.error} />
      {env && !vista.error && (
        <>
          <h2 style={{ margin: '0 0 var(--s3)', fontSize: 'var(--fs-title-sm, 1.1rem)' }}>
            {t('documento.de_titular', { titular: razones.get(consultado) ?? t('documento.sin_razon_social'), nit: consultado })}
          </h2>
          <Alert variant="info" title={t('documento.lo_que_recibe', { version: vista.data!.version })} style={{ marginBottom: 'var(--s4)' }} />
          <div className="fin-indicadores" style={{ display: 'flex', gap: 'var(--s5)', marginBottom: 'var(--s4)', flexWrap: 'wrap' }}>
            <Indicador etiqueta={t('documento.documentos')} valor={String(env.summary.TotalInvoices)} />
            <Indicador etiqueta={t('documento.total')} valor={formatoMoneda(env.summary.TotalNet)} />
            <Indicador etiqueta={t('documento.rango')} valor={`${formatoFecha(env.metadata.RequestedPeriod.From)} – ${formatoFecha(env.metadata.RequestedPeriod.To)}`} />
          </div>
          {env.invoices.length === 0 ? (
            <EstadoVacio icono={<FileSearch size={28} aria-hidden />} titulo={t('documento.vacio_titulo')} detalle={t('documento.vacio_detalle')} />
          ) : (
            <ScrollRegion label={t('documento.documentos')}>
              <table style={TABLA}>
                <thead>
                  <tr>
                    <th style={TH}>{t('documento.col_documento')}</th><th style={TH}>{t('documento.col_tercero')}</th>
                    <th style={TH}>{t('documento.col_fecha')}</th><th style={TH}>{t('documento.col_lineas')}</th>
                    <th style={TH_NUM}>{t('documento.col_total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {env.invoices.map((d) => (
                    <tr key={d.Header.DocumentId}>
                      <td style={TD}><strong>{d.Header.Prefix ? `${d.Header.Prefix}-${d.Header.Serial}` : d.Header.Serial}</strong>
                        <span className="fin-secundario">{d.Header.Type.Name}</span></td>
                      <td style={TD}>{d.ThirdParty.Name}<span className="fin-secundario">{t('documento.nit_tercero', { nit: d.ThirdParty.NIT ?? t('documento.sin_nit') })}</span></td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(d.Header.IssueDate)}
                        <span className="fin-secundario">{t('documento.vence', { fecha: formatoFecha(d.Header.DueDate) })}</span></td>
                      <td style={TD}>{d.Lines.map((ln, i) => (
                        <span key={i} style={{ display: 'block' }}>
                          {ln.Name} · {t('documento.cuentas', { cuentas: ln.accounting_account.join(' / ') })} · {formatoMoneda(ln.Value)}
                          <span className="fin-secundario">{ln.Description}</span>
                        </span>
                      ))}</td>
                      <td style={TD_NUM}><strong>{formatoMoneda(d.Totals.TotalPayment)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          )}
          <p style={{ ...SECUNDARIO, marginTop: 'var(--s4)', wordBreak: 'break-all' }}>{t('documento.huella', { hash: vista.data!.hash })}</p>
        </>
      )}
    </>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ ...PANEL, minWidth: 180 }}>
      <span className="fin-secundario">{etiqueta}</span>
      <strong style={{ fontSize: 'var(--fs-title-md, 1.25rem)' }}>{valor}</strong>
    </div>
  );
}
