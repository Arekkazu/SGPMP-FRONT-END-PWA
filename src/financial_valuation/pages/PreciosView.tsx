// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-89: repositorio de precios de mercado con vigencia, desviación y corrección |
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, PencilLine, Tag } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { metricasApi } from '../../configuration/api/especiesConfigApi';
import { decimalPositivo } from '../../supplies/lib/formato';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_C, ACCION_R, R_CONFIGURACION, R_PRECIOS } from '../rbac';
import type { CategoriaPrecio, FuentePrecio, Precio, PrecioPayload } from '../types';
import {
  AreaTexto, EncabezadoVista, EstadoBadge, EstadoVacio, ErrorApi, FILTROS, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM,
  formatoFecha, formatoMoneda, useAsync,
} from '../components/comunes';

export function PreciosView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_PRECIOS, ACCION_R);
  const puedeRegistrar = usePermissionPorNombre(R_PRECIOS, ACCION_C);
  const puedeVerConfig = usePermissionPorNombre(R_CONFIGURACION, ACCION_R);
  const precios = useAsync(finanzasApi.precios);
  const config = useAsync(finanzasApi.configuracion);
  const [especie, setEspecie] = useState('');
  const [modal, setModal] = useState<{ corrige?: Precio } | null>(null);
  const { ejecutar: cargar } = precios;
  const { ejecutar: cargarConfig } = config;
  useEffect(() => { if (puedeLeer) cargar(especie ? Number(especie) : undefined); }, [puedeLeer, especie, cargar]);
  useEffect(() => { if (puedeVerConfig) cargarConfig(); }, [puedeVerConfig, cargarConfig]);

  const especies = config.data?.especies ?? [];
  const nombre = (id: number) => especies.find((e) => e.id_especie === id)?.especie ?? `#${id}`;
  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.precios')} />;
  const lista = precios.data ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('precios.titulo')}
        descripcion={t('precios.descripcion')}
        acciones={puedeRegistrar && puedeVerConfig && (
          <Button variant="primary" size="md" onClick={() => setModal({})}><Plus size={18} aria-hidden />{t('precios.registrar')}</Button>
        )}
      />
      <div style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        {especies.length > 0 && (
          <Select id="precios-especie" label={t('col.especie')} value={especie} onChange={(e) => setEspecie(e.target.value)}>
            <option value="">{t('comun.todas')}</option>
            {especies.map((e) => <option key={e.id_especie} value={e.id_especie}>{e.especie}</option>)}
          </Select>
        )}
      </div>
      <ErrorApi error={precios.error} />
      {lista.length === 0 ? (
        <EstadoVacio icono={<Tag size={28} aria-hidden />} titulo={precios.cargando ? t('comun.cargando') : t('precios.vacio_titulo')} detalle={t('precios.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('precios.titulo')}>
          <table style={TABLA}>
            <thead>
              <tr>
                <th style={TH}>{t('col.especie')}</th><th style={TH}>{t('col.categoria')}</th><th style={TH_NUM}>{t('col.precio')}</th>
                <th style={TH}>{t('col.fuente')}</th><th style={TH}>{t('col.vigencia')}</th><th style={TH}>{t('col.vencimiento')}</th>
                <th style={TH}>{t('col.estado')}</th><th style={TH}>{t('col.evidencia')}</th>
                {puedeRegistrar && <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id_precio_mercado}>
                  <td style={TD}>{nombre(p.id_especie)}</td>
                  <td style={TD}>{t(`categoria.${p.categoria}`)}</td>
                  <td style={TD_NUM}>{formatoMoneda(p.precio_unitario)} / {p.unidad_medida}</td>
                  <td style={TD}>{t(`fuente.${p.fuente}`)}</td>
                  <td style={TD}>{formatoFecha(p.fecha_vigencia)}</td>
                  <td style={TD}>{formatoFecha(p.fecha_vencimiento)}</td>
                  <td style={TD}>
                    <EstadoBadge estado={p.estado} />
                    {p.es_aplicado && <div style={{ ...SECUNDARIO, marginTop: 'var(--s1)' }}>{t('precios.aplicado')}</div>}
                    {p.id_precio_corregido && <div style={{ ...SECUNDARIO, marginTop: 'var(--s1)' }}>{t('precios.corrige', { id: p.id_precio_corregido })}</div>}
                  </td>
                  <td style={{ ...TD, maxWidth: 260, overflowWrap: 'anywhere' }}>{p.evidencia}{p.justificacion ? <div style={SECUNDARIO}>{p.justificacion}</div> : null}</td>
                  {puedeRegistrar && (
                    <td style={TD}>
                      {puedeVerConfig && (
                        <Button variant="ghost" size="sm" onClick={() => setModal({ corrige: p })} aria-label={t('precios.corregir_aria', { id: p.id_precio_mercado })}>
                          <PencilLine size={14} aria-hidden />{t('precios.corregir')}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {modal && (
        <PrecioModal especies={especies} corrige={modal.corrige} onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar(especie ? Number(especie) : undefined); }} />
      )}
    </>
  );
}

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function PrecioModal({ especies, corrige, onCerrar, onGuardado }: {
  especies: Array<{ id_especie: number; especie: string }>; corrige?: Precio; onCerrar: () => void; onGuardado: () => void;
}) {
  const { t } = useT('finanzas');
  const [f, setF] = useState({
    especie: corrige ? String(corrige.id_especie) : '', categoria: (corrige?.categoria ?? 'PESO_KG') as CategoriaPrecio,
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
  useEffect(() => {
    if (registro.error?.code === 'DESVIACION_PRECIO_REQUIERE_CONFIRMACION') setDesviacion(registro.error.message);
  }, [registro.error]);

  return (
    <ModalShell
      title={corrige ? t('precios.corregir_titulo', { id: corrige.id_precio_mercado }) : t('precios.registrar')}
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
