// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-05 | Arekkazu | M06 RF-84 prototipo: valor razonable menos costos de venta a hoy e historial del período |
// | 2026-11-09 | destroyerban | INC-M06-317-G17 RF-84: validar con justificación un cálculo con valor neto ≤ 0 |
import React, { useEffect, useState } from 'react';
import { Calculator, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_E, ACCION_R, R_VALORACION } from '../rbac';
import type { CalculoPeriodo } from '../types';
import {
  AreaTexto, CeldaActivo, Datos, EncabezadoVista, EstadoBadge, ErrorApi, Listado, SECUNDARIO, SinPeriodo, Subtitulo, TABLA, TD, TD_NUM, TH,
  TH_NUM, formatoCantidad, formatoFecha, formatoMoneda, useAsync, useListado, usePeriodo,
} from '../components/comunes';

export function CalculoView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_VALORACION, ACCION_R);
  const puedeValidar = usePermissionPorNombre(R_VALORACION, ACCION_E);
  const [validando, setValidando] = useState<CalculoPeriodo | null>(null);
  const { periodo } = usePeriodo();
  const activos = useAsync(finanzasApi.activos);
  const simulacion = useAsync(finanzasApi.simular);
  const calculos = useAsync(finanzasApi.calculos);
  const [idActivo, setIdActivo] = useState('');
  const id = periodo?.id_periodo_contable;
  const { ejecutar: cargarActivos } = activos;
  const { ejecutar: simular, limpiar: limpiarSimulacion } = simulacion;
  const { ejecutar: cargarCalculos } = calculos;
  useEffect(() => { if (puedeLeer) cargarActivos(); }, [puedeLeer, cargarActivos]);
  useEffect(() => { if (puedeLeer && id) cargarCalculos(id); }, [puedeLeer, id, cargarCalculos]);
  useEffect(() => { if (idActivo) simular(Number(idActivo)); else limpiarSimulacion(); }, [idActivo, simular, limpiarSimulacion]);

  const l = useListado(calculos.data, (c) => `${c.identificador} ${c.especie} ${c.finca}`, [
    { id: 'tipo', etiqueta: t('calculo.tipo'), valor: (c) => (c.es_producto ? 'PRODUCTO' : 'ACTIVO'), texto: (v) => t(`calculo.tipo_${v}`) },
    { id: 'metodo', etiqueta: t('calculo.metodo_costos'), valor: (c) => c.metodo_costo, texto: (v) => t(`metodo_costo.${v}`) },
    { id: 'estado', etiqueta: t('col.estado'), valor: (c) => c.estado, texto: (v) => t(`estado.${v}`) },
    { id: 'especie', etiqueta: t('col.especie'), valor: (c) => c.especie, texto: (v) => v, femenino: true },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.valor-razonable')} />;
  const s = simulacion.data;
  const c = s?.calculo;
  const enRevision = (calculos.data ?? []).filter((x) => x.estado === 'REVISION_REQUERIDA').length;

  return (
    <>
      <EncabezadoVista titulo={t('calculo.titulo')} descripcion={t('calculo.descripcion')} />
      <section className="fin-tarjeta" aria-labelledby="calculo-activo" style={{ marginBottom: 'var(--s5)' }}>
        <h2 id="calculo-activo">{t('calculo.activo_titulo')}</h2>
        <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('calculo.activo_ayuda')}</p>
        <ErrorApi error={activos.error ?? simulacion.error} />
        <Select id="calculo-activo-sel" label={t('col.activo')} required value={idActivo} onChange={(e) => setIdActivo(e.target.value)}
          disabled={activos.cargando || (activos.data ?? []).length === 0}
          hint={!activos.cargando && (activos.data ?? []).length === 0 ? t('valor.vacio_detalle') : undefined}>
          <option value="">{activos.cargando ? t('comun.cargando') : t('calculo.elegir_activo')}</option>
          {(activos.data ?? []).map((a) => <option key={a.id_activo_biologico} value={a.id_activo_biologico}>{a.identificador} · {a.especie} · {a.finca}</option>)}
        </Select>
        {simulacion.cargando && <p style={{ ...SECUNDARIO, margin: 'var(--s3) 0 0' }}>{t('comun.cargando')}</p>}
        {s && (
          <div style={{ marginTop: 'var(--s4)', display: 'grid', gap: 'var(--s3)' }}>
            {!s.es_valido && <Alert variant="warning" title={s.mensaje ?? t(`motivo.${s.motivo}`, { defaultValue: t('valor.simulacion_invalida') })} />}
            {c && (
              <Datos filas={[
                [t('col.magnitud'), `${formatoCantidad(c.magnitud)} ${c.unidad_magnitud}`],
                [t('calculo.precio_mercado'), s.precio
                  ? `${formatoMoneda(s.precio.precio_unitario)} / ${s.precio.unidad_medida} · ${t(`fuente.${s.precio.fuente}`)}` : t('recon.sin_precio')],
                [t('col.valor_bruto'), formatoMoneda(c.valor_razonable_bruto)],
                [t('col.costo_transporte'), formatoMoneda(c.costo_transporte)],
                [t('col.costo_comisiones'), formatoMoneda(c.costo_comisiones)],
                [t('col.costo_impuestos'), formatoMoneda(c.costo_impuestos_transaccion)],
                [t('col.valor_neto'), <strong key="vn">{formatoMoneda(c.valor_neto)}</strong>],
              ]} />
            )}
            {c?.tiene_valor_estimado && <Badge variant="warning">{t('valor.estimado')}</Badge>}
            <p style={{ ...SECUNDARIO, margin: 0 }}>{t('valor.simulacion_ayuda')}</p>
          </div>
        )}
      </section>

      <Subtitulo>{t('calculo.historial')}</Subtitulo>
      <ErrorApi error={calculos.error} />
      {enRevision > 0 && (
        <Alert variant="error" title={t('calculo.aviso_revision', { count: enRevision })} description={t('calculo.aviso_revision_detalle')}
          style={{ marginBottom: 'var(--s4)' }} />
      )}
      {!periodo ? <SinPeriodo /> : (
        <Listado l={l} idBase="calculo" sustantivo={t('calculo.sustantivo')} buscar={t('medicion.buscar')} cargando={calculos.cargando}
          vacio={{ icono: <Calculator size={28} aria-hidden />, titulo: t('calculo.vacio_titulo'), detalle: t('calculo.vacio_detalle') }}>
          {(visibles) => (
            <table style={TABLA}>
              <thead>
                <tr>
                  <th style={TH}>{t('col.activo')}</th><th style={TH}>{t('col.fecha')}</th><th style={TH_NUM}>{t('col.magnitud')}</th>
                  <th style={TH_NUM}>{t('col.valor_bruto')}</th><th style={TH_NUM}>{t('col.costos_venta')}</th>
                  <th style={TH_NUM}>{t('calculo.valor_neto_corto')}</th><th style={TH}>{t('calculo.metodo_costos')}</th><th style={TH}>{t('col.estado')}</th>
                  {puedeValidar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
                </tr>
              </thead>
              <tbody>
                {visibles.map((x) => (
                  <tr key={x.id_calculo_valor_razonable}>
                    <td style={TD}>
                      <CeldaActivo identificador={x.identificador} especie={x.especie} finca={x.finca} />
                      {x.es_producto && <span className="fin-secundario">{t('calculo.tipo_PRODUCTO')}</span>}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(x.fecha_calculo, true)}</td>
                    <td style={TD_NUM}>{formatoCantidad(x.magnitud)} {x.unidad_magnitud}<span className="fin-secundario">{t('calculo.por_precio', { precio: formatoMoneda(x.precio_unitario) })}</span></td>
                    <td style={TD_NUM}>{formatoMoneda(x.valor_razonable_bruto)}</td>
                    <td style={TD_NUM}><span className="fin-neg">−{formatoMoneda(x.costos_venta)}</span></td>
                    <td style={TD_NUM}><strong>{formatoMoneda(x.valor_neto)}</strong>{x.tiene_valor_estimado && <span className="fin-secundario">{t('valor.estimado')}</span>}</td>
                    <td style={TD}>{t(`metodo_costo.${x.metodo_costo}`, { defaultValue: t('metodo_costo.PARAMETRIZADO') })}</td>
                    <td style={TD}><EstadoBadge estado={x.estado} /></td>
                    {puedeValidar && (
                      <td style={TD}>
                        {x.estado === 'REVISION_REQUERIDA' && (
                          <Button variant="secondary" size="sm" onClick={() => setValidando(x)}
                            aria-label={t('calculo.validar_aria', { activo: x.identificador })}>{t('calculo.validar')}</Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Listado>
      )}
      {validando && (
        <ValidarCalculoModal calculo={validando} onCerrar={() => setValidando(null)}
          onValidado={() => { setValidando(null); if (id) cargarCalculos(id); }} />
      )}
    </>
  );
}

// RF-84 R3 / FA-2: un valor neto ≤ 0 queda en revisión hasta que el Contador lo valida con una justificación.
function ValidarCalculoModal({ calculo, onCerrar, onValidado }: {
  calculo: CalculoPeriodo; onCerrar: () => void; onValidado: () => void;
}) {
  const { t } = useT('finanzas');
  const validacion = useAsync(finanzasApi.validarCalculo);
  const [justificacion, setJustificacion] = useState('');
  const [aviso, setAviso] = useState<string>();

  const validar = async () => {
    if (justificacion.trim().length < 20) { setAviso(t('calculo.justificacion_corta')); return; }
    setAviso(undefined);
    const r = await validacion.ejecutar(calculo.id_calculo_valor_razonable, justificacion.trim());
    if (r) {
      pushToast('success', t('calculo.validado', { activo: calculo.identificador }));
      onValidado();
    }
  };

  return (
    <ModalShell
      title={t('calculo.validar_titulo', { activo: calculo.identificador })}
      onClose={onCerrar}
      maxWidth={560}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={validacion.cargando}>{t('comun.cancelar')}</Button>
          <Button variant="primary" size="md" loading={validacion.cargando} onClick={validar}>
            <ShieldCheck size={16} aria-hidden />{t('calculo.validar_confirmar')}
          </Button>
        </>
      )}
    >
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('calculo.validar_ayuda')}</p>
      <ErrorApi error={validacion.error} />
      <Datos filas={[
        [t('col.valor_bruto'), formatoMoneda(calculo.valor_razonable_bruto)],
        [t('col.costos_venta'), formatoMoneda(calculo.costos_venta)],
        [t('col.valor_neto'), <strong key="vn">{formatoMoneda(calculo.valor_neto)}</strong>],
      ]} />
      <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
        <AreaTexto id="vc-justificacion" label={t('calculo.justificacion')} required maxLength={2000} value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)} hint={t('calculo.justificacion_ayuda')} />
        {aviso && <Alert variant="error" title={aviso} />}
      </div>
    </ModalShell>
  );
}
