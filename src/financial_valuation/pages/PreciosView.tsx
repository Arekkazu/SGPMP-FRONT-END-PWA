// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-89: repositorio de precios de mercado con vigencia, desviación y corrección |
// | 2026-11-05 | Arekkazu | M06 RF-89 prototipo: avisos de especies sin precio, por vencer y programados; filtros completos |
// | 2026-11-10 | Arekkazu | #510 RF-89: un error al confirmar la desviación se muestra en vez del aviso |
import React, { useEffect, useMemo, useState } from 'react';
import { PencilLine, Plus, Tag } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { metricasApi } from '../../configuration/api/especiesConfigApi';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, R_CONFIGURACION, R_PRECIOS } from '../rbac';
import type { CategoriaPrecio, FuentePrecio, Precio, PrecioPayload } from '../types';
import {
  AreaTexto, EncabezadoVista, EstadoBadge, ErrorApi, Listado, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM,
  formatoFecha, formatoMoneda, useAsync, useListado,
} from '../components/comunes';

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diasHasta = (fecha: string) => Math.round((new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoyIso()}T00:00:00`).getTime()) / 86_400_000);

export function PreciosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_PRECIOS, ACCION_R);
  const puedeRegistrar = usePermissionPorNombre(R_PRECIOS, ACCION_C);
  const puedeVerConfig = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const precios = useAsync(finanzasApi.precios);
  const config = useAsync(finanzasApi.configuracion);
  const [modal, setModal] = useState<{ corrige?: Precio; especie?: number } | null>(null);
  const { ejecutar: cargar } = precios;
  const { ejecutar: cargarConfig } = config;
  useEffect(() => { if (puedeLeer) cargar(); }, [puedeLeer, cargar]);
  useEffect(() => { if (puedeVerConfig) cargarConfig(); }, [puedeVerConfig, cargarConfig]);

  const especies = config.data?.especies ?? [];
  const nombre = (id: number) => especies.find((e) => e.id_especie === id)?.especie ?? t('precios.especie_sin_nombre');
  const lista = precios.data ?? [];
  const l = useListado(lista, (p) => `${nombre(p.id_especie)} ${p.evidencia} ${p.justificacion ?? ''}`, [
    { id: 'especie', etiqueta: t('col.especie'), valor: (p) => String(p.id_especie), texto: (v) => nombre(Number(v)), femenino: true },
    { id: 'categoria', etiqueta: t('col.categoria'), valor: (p) => p.categoria, texto: (v) => t(`categoria.${v}`), femenino: true },
    { id: 'fuente', etiqueta: t('col.fuente'), valor: (p) => p.fuente, texto: (v) => t(`fuente.${v}`), femenino: true },
    { id: 'estado', etiqueta: t('col.estado'), valor: (p) => p.estado, texto: (v) => t(`estado.${v}`) },
  ]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.precios')} />;

  // Especies que se miden con precio (tienen clasificación) y no tienen ninguno vigente hoy.
  const vigentes = new Set(lista.filter((p) => p.estado === 'ACTIVO').map((p) => p.id_especie));
  const sinPrecio = especies.filter((e) => e.clasificacion && !vigentes.has(e.id_especie));
  const ventana = config.data?.general.dias_alerta_vencimiento_precio ?? 30;
  const porVencer = lista.filter((p) => p.estado === 'ACTIVO' && p.fecha_vencimiento && diasHasta(p.fecha_vencimiento) <= ventana);
  const programados = lista.filter((p) => p.estado === 'PROGRAMADO');
  const corregido = (p: Precio) => lista.find((x) => x.id_precio_mercado === p.id_precio_corregido);

  return (
    <>
      <EncabezadoVista
        titulo={t('precios.titulo')}
        descripcion={t('precios.descripcion')}
        acciones={puedeRegistrar && puedeVerConfig && (
          <Button variant="primary" size="md" onClick={() => setModal({})}><Plus size={18} aria-hidden />{t('precios.registrar')}</Button>
        )}
      />
      <div className="fin-avisos">
        <Alert variant="info" title={t('precios.aviso_titulo')} description={t('precios.aviso_detalle')} />
        {sinPrecio.length > 0 && (
          <div className="fin-acciones" style={{ alignItems: 'center' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <Alert variant="error" title={t('precios.sin_vigente_titulo', { count: sinPrecio.length })}
                description={t('precios.sin_vigente_detalle', { especies: sinPrecio.map((e) => e.especie).join(', ') })} />
            </div>
            {puedeRegistrar && <Button variant="danger" size="md" onClick={() => setModal({ especie: sinPrecio[0].id_especie })}>{t('precios.registrar_ahora')}</Button>}
          </div>
        )}
        {porVencer.length > 0 && (
          <Alert variant="warning" title={t('precios.por_vencer_titulo', { count: porVencer.length })}
            description={porVencer.map((p) => t('precios.por_vencer_item', { especie: nombre(p.id_especie), categoria: t(`categoria.${p.categoria}`),
              fecha: formatoFecha(p.fecha_vencimiento), count: diasHasta(p.fecha_vencimiento as string) })).join(' · ')} />
        )}
        {programados.length > 0 && (
          <Alert variant="info" title={t('precios.programados_titulo', { count: programados.length })}
            description={programados.map((p) => t('precios.programado_item', { especie: nombre(p.id_especie), fecha: formatoFecha(p.fecha_vigencia) })).join(' · ')} />
        )}
      </div>
      <ErrorApi error={precios.error ?? config.error} />
      <Listado l={l} idBase="precios" sustantivo={t('precios.sustantivo')} buscar={t('precios.buscar')} cargando={precios.cargando}
        vacio={{ icono: <Tag size={28} aria-hidden />, titulo: t('precios.vacio_titulo'), detalle: t('precios.vacio_detalle') }}>
        {(visibles) => (
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('precios.especie_categoria')}</th><th style={TH_NUM}>{t('precios.precio_unitario_col')}</th>
                <th style={TH}>{t('col.fuente')}</th><th style={TH}>{t('col.vigencia')}</th><th style={TH}>{t('col.vencimiento')}</th>
                <th style={TH}>{t('col.estado')}</th><th style={TH}>{t('col.evidencia')}</th>
                {puedeRegistrar && puedeVerConfig && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => (
                <tr key={p.id_precio_mercado}>
                  <td style={TD}>
                    <strong>{nombre(p.id_especie)}</strong>
                    <span className="fin-secundario">{t(`categoria.${p.categoria}`)}</span>
                    {p.es_aplicado && <Badge variant="success">{t('precios.aplicado')}</Badge>}
                  </td>
                  <td style={TD_NUM}>{formatoMoneda(p.precio_unitario)} / {p.unidad_medida}</td>
                  <td style={TD}>{t(`fuente.${p.fuente}`)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(p.fecha_vigencia)}</td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.fecha_vencimiento ? formatoFecha(p.fecha_vencimiento) : t('precios.indefinida')}</td>
                  <td style={TD}>
                    <EstadoBadge estado={p.estado} />
                    {p.id_precio_corregido && (
                      <span className="fin-secundario">{t('precios.corrige', { fecha: formatoFecha(corregido(p)?.fecha_vigencia) })}</span>
                    )}
                  </td>
                  <td style={{ ...TD, maxWidth: 260, overflowWrap: 'anywhere' }}>{p.evidencia}{p.justificacion && <span className="fin-secundario">{p.justificacion}</span>}</td>
                  {puedeRegistrar && puedeVerConfig && (
                    <td style={TD}>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ corrige: p })}
                        aria-label={t('precios.corregir_aria', { especie: nombre(p.id_especie), fecha: formatoFecha(p.fecha_vigencia) })}>
                        <PencilLine size={14} aria-hidden />{t('precios.corregir')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Listado>
      {modal && (
        <PrecioModal especies={especies} corrige={modal.corrige} especieInicial={modal.especie} onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(); }} />
      )}
    </>
  );
}

function PrecioModal({ especies, corrige, especieInicial, onCerrar, onGuardado }: {
  especies: Array<{ id_especie: number; especie: string }>; corrige?: Precio; especieInicial?: number; onCerrar: () => void; onGuardado: () => void;
}) {
  const { t } = useT('finanzas');
  const [f, setF] = useState({
    especie: corrige ? String(corrige.id_especie) : especieInicial ? String(especieInicial) : '', categoria: (corrige?.categoria ?? 'PESO_KG') as CategoriaPrecio,
    metrica: corrige?.id_metrica_produccion ? String(corrige.id_metrica_produccion) : '', precio: '',
    vigencia: corrige?.fecha_vigencia ?? hoyIso(), vencimiento: '', fuente: (corrige?.fuente ?? 'MERCADO_ACTIVO') as FuentePrecio,
    evidencia: '', justificacion: '',
  });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [desviacion, setDesviacion] = useState<string | null>(null);
  const registro = useAsync(finanzasApi.registrarPrecio);
  const metricas = useAsync(metricasApi.listar);
  const { ejecutar: cargarMetricas } = metricas;
  useEffect(() => { if (f.categoria === 'PRODUCTO' && f.especie) cargarMetricas(Number(f.especie), true); }, [f.categoria, f.especie, cargarMetricas]);
  const productos = useMemo(() => (metricas.data ?? []).filter((m) => m.es_activo), [metricas.data]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setDesviacion(null); setF({ ...f, [k]: e.target.value }); };

  const enviar = async (confirmar: boolean) => {
    const err: Record<string, string> = {};
    const precio = decimalPositivo(f.precio);
    if (!f.especie) err.especie = t('comun.requerido');
    if (!precio) err.precio = t('precios.precio_invalido');
    if (!f.vigencia) err.vigencia = t('comun.requerido');
    if (f.vencimiento && f.vencimiento <= f.vigencia) err.vencimiento = t('precios.vencimiento_invalido');
    if (f.categoria === 'PRODUCTO' && !f.metrica) err.metrica = t('comun.requerido');
    if (!f.evidencia.trim()) err.evidencia = t('comun.requerido');
    if (f.fuente === 'ESTIMADA' && f.justificacion.trim().length < 50) err.justificacion = t('precios.justificacion_estimada');
    setErrores(err);
    if (Object.keys(err).length) return;
    const payload: PrecioPayload = {
      id_especie: Number(f.especie), categoria: f.categoria, id_metrica_produccion: f.categoria === 'PRODUCTO' ? Number(f.metrica) : null,
      precio_unitario: precio as string, fecha_vigencia: f.vigencia, fecha_vencimiento: f.vencimiento || null, fuente: f.fuente,
      evidencia_documental: f.evidencia.trim(), justificacion_estimacion: f.justificacion.trim() || null,
      id_precio_corregido: corrige?.id_precio_mercado ?? null, confirmar_desviacion: confirmar,
    };
    const r = await registro.ejecutar(payload);
    if (r) {
      pushToast('success', t('precios.guardado'), r.estado === 'PROGRAMADO' ? t('precios.programado', { fecha: formatoFecha(r.fecha_vigencia) }) : undefined);
      onGuardado();
    }
  };

  // RF-89 FA-3: una desviación mayor al umbral exige confirmación explícita.
  // Cualquier otro error reemplaza el aviso: si no, un fallo al confirmar quedaba oculto tras el aviso amarillo.
  useEffect(() => {
    if (!registro.error) return;
    setDesviacion(registro.error.code === 'DESVIACION_PRECIO_REQUIERE_CONFIRMACION' ? registro.error.message : null);
  }, [registro.error]);

  return (
    <ModalShell
      title={corrige ? t('precios.corregir_titulo', { especie: especies.find((e) => e.id_especie === corrige.id_especie)?.especie ?? '', fecha: formatoFecha(corrige.fecha_vigencia) }) : t('precios.registrar')}
      onClose={onCerrar}
      maxWidth={640}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={registro.cargando}>{t('comun.cancelar')}</Button>
          {desviacion
            ? <Button variant="primary" size="md" loading={registro.cargando} onClick={() => enviar(true)}>{t('precios.confirmar_desviacion')}</Button>
            : <Button variant="primary" size="md" loading={registro.cargando} onClick={() => enviar(false)}>{t('comun.guardar')}</Button>}
        </>
      )}
    >
      <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{corrige ? t('precios.corregir_ayuda') : t('precios.registrar_ayuda')}</p>
      {desviacion
        ? <Alert variant="warning" title={t('precios.desviacion_titulo')} description={desviacion} style={{ marginBottom: 'var(--s4)' }} />
        : <ErrorApi error={registro.error} />}
      <div className="ds-fg2">
        <Select id="pr-especie" label={t('col.especie')} required value={f.especie} onChange={set('especie')} error={errores.especie} disabled={!!corrige}>
          <option value="">{t('comun.elegir')}</option>
          {especies.map((e) => <option key={e.id_especie} value={e.id_especie}>{e.especie}</option>)}
        </Select>
        <Select id="pr-categoria" label={t('col.categoria')} required value={f.categoria} onChange={set('categoria')} disabled={!!corrige}>
          {(['PESO_KG', 'POR_CABEZA', 'PRODUCTO'] as const).map((c) => <option key={c} value={c}>{t(`categoria.${c}`)}</option>)}
        </Select>
        {f.categoria === 'PRODUCTO' && (
          <Select id="pr-metrica" label={t('precios.producto')} required value={f.metrica} onChange={set('metrica')} error={errores.metrica}
            disabled={!!corrige || metricas.cargando} hint={f.especie && !metricas.cargando && productos.length === 0 ? t('precios.sin_productos') : undefined}>
            <option value="">{t('comun.elegir')}</option>
            {productos.map((m) => <option key={m.id_metrica_produccion} value={m.id_metrica_produccion}>{m.nombre} ({m.unidad_medida})</option>)}
          </Select>
        )}
        <Input id="pr-precio" label={t('precios.precio_unitario')} required inputMode="decimal" value={f.precio} onChange={set('precio')} error={errores.precio}
          hint={t(`precios.unidad_${f.categoria}`)} />
        <Select id="pr-fuente" label={t('col.fuente')} required value={f.fuente} onChange={set('fuente')} hint={t('precios.fuente_ayuda')}>
          {(['MERCADO_ACTIVO', 'UPRA', 'ESTIMADA'] as const).map((x) => <option key={x} value={x}>{t(`fuente.${x}`)}</option>)}
        </Select>
        <Input id="pr-vigencia" label={t('col.vigencia')} type="date" required value={f.vigencia} onChange={set('vigencia')} error={errores.vigencia} hint={t('precios.vigencia_ayuda')} />
        <Input id="pr-vencimiento" label={t('col.vencimiento')} type="date" value={f.vencimiento} onChange={set('vencimiento')} error={errores.vencimiento} />
      </div>
      <div style={{ display: 'grid', gap: 'var(--s4)', marginTop: 'var(--s4)' }}>
        <Input id="pr-evidencia" label={t('col.evidencia')} required maxLength={500} value={f.evidencia} onChange={set('evidencia')} error={errores.evidencia} hint={t('precios.evidencia_ayuda')} />
        {f.fuente === 'ESTIMADA' && (
          <AreaTexto id="pr-justificacion" label={t('precios.justificacion')} required maxLength={500} value={f.justificacion} onChange={set('justificacion')}
            error={errores.justificacion} hint={t('precios.justificacion_ayuda')} />
        )}
      </div>
    </ModalShell>
  );
}
