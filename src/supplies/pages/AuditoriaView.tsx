// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-80: bitácora de auditoría del módulo con filtros, detalle y exportación |
import React, { useEffect, useState } from 'react';
import { Search, FileDown, Eye, ScrollText } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useT } from '../../shared/i18n/useT';
import { ACCION_E, ACCION_R, RECURSO_AUDITORIA } from '../rbac';
import { useAuditoriaSuministros } from '../hooks/useAuditoriaSuministros';
import { useActivosSuministros } from '../hooks/useActivosSuministros';
import { guardarArchivo } from '../lib/descarga';
import { formatoFecha, formatoMoneda } from '../lib/formato';
import type { FiltrosAuditoria } from '../types';
import { EncabezadoVista } from '../components/EncabezadoVista';
import { EstadoVacio } from '../components/EstadoVacio';
import { EstadoRegistroBadge } from '../components/EstadoRegistroBadge';
import { SelectorActivo } from '../components/SelectorActivo';
import { Paginacion } from '../components/Paginacion';
import { EventoAuditoriaModal } from '../components/EventoAuditoriaModal';
import { FILTROS, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from '../components/estilos';

const POR_PAGINA = 50;
const OPERACIONES = [
  'SUMINISTRO_REGISTRADO', 'SUMINISTRO_CORREGIDO', 'REGISTRO_FALLIDO', 'CONFLICTO_CONCURRENCIA', 'CICLO_CONSOLIDADO',
  'PROVISION_INCREMENTAL_ENTREGADA', 'PROVISION_INCREMENTAL_FALLIDA', 'REPORTE_COSTOS_GENERADO', 'PRECIO_MANUAL_INGRESADO',
  'ACUMULADO_ACTUALIZADO', 'PROVISION_PENDIENTE', 'CONSULTA_HISTORIAL_EJECUTADA', 'EXPORTACION_HISTORIAL_GENERADA',
  'EXPORTACION_HISTORIAL_ELIMINADA', 'INSERT', 'UPDATE', 'DELETE',
];
const RESULTADOS = ['EXITOSO', 'FALLIDO', 'RECHAZADO'];
const FORMATOS: { valor: 'csv' | 'xlsx' | 'pdf'; etiqueta: string }[] = [{ valor: 'csv', etiqueta: 'CSV' }, { valor: 'xlsx', etiqueta: 'Excel' }, { valor: 'pdf', etiqueta: 'PDF' }];

export function AuditoriaView() {
  const { t } = useT('supplies');
  const puedeLeer = usePermission(RECURSO_AUDITORIA, ACCION_R);
  const puedeExportar = usePermission(RECURSO_AUDITORIA, ACCION_E);
  const online = useOnlineStatus();
  const { activos, cargando: cargandoActivos } = useActivosSuministros();
  const { lista, detalle, exportacion } = useAuditoriaSuministros();
  const [texto, setTexto] = useState('');
  const [idActivo, setIdActivo] = useState<number | null>(null);
  const [operacion, setOperacion] = useState('');
  const [resultado, setResultado] = useState('');
  const [clasificacion, setClasificacion] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({ pagina: 1, registros_por_pagina: POR_PAGINA });
  const [verId, setVerId] = useState<number | null>(null);

  const { ejecutar: listar } = lista;
  useEffect(() => { if (puedeLeer) listar(filtros); }, [puedeLeer, filtros, listar]);
  const { ejecutar: cargarDetalle } = detalle;
  useEffect(() => { if (verId !== null) cargarDetalle(verId); }, [verId, cargarDetalle]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;

  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangoInvalido) return;
    setFiltros({
      tipo_operacion: operacion || undefined,
      resultado: resultado || undefined,
      clasificacion_registro: clasificacion || undefined,
      id_activo_biologico: idActivo ?? undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined,
      pagina: 1,
      registros_por_pagina: POR_PAGINA,
    });
  };
  const exportar = async (formato: 'csv' | 'xlsx' | 'pdf') => {
    const blob = await exportacion.ejecutar(filtros, formato);
    if (blob) guardarArchivo(blob, `auditoria_suministros.${formato}`);
  };

  const data = lista.data;
  const items = data?.items ?? [];

  return (
    <>
      <EncabezadoVista
        titulo={t('auditoria.titulo')}
        descripcion={t('auditoria.descripcion')}
        acciones={puedeExportar && FORMATOS.map((f) => (
          <Button key={f.valor} variant="secondary" size="md" disabled={!online || exportacion.cargando} onClick={() => exportar(f.valor)}>
            <FileDown size={16} aria-hidden />{f.etiqueta}
          </Button>
        ))}
      />
      <form onSubmit={buscar} role="search" style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <Select id="auditoria-operacion" label={t('auditoria.operacion')} value={operacion} onChange={(e) => setOperacion(e.target.value)}>
          <option value="">{t('comun.todas')}</option>
          {OPERACIONES.map((o) => <option key={o} value={o}>{t(`evento.${o}`, { defaultValue: o })}</option>)}
        </Select>
        <Select id="auditoria-resultado" label={t('auditoria.resultado')} value={resultado} onChange={(e) => setResultado(e.target.value)}>
          <option value="">{t('comun.todos')}</option>
          {RESULTADOS.map((r) => <option key={r} value={r}>{t(`estado.${r}`)}</option>)}
        </Select>
        <Select id="auditoria-clasificacion" label={t('auditoria.clasificacion')} value={clasificacion} onChange={(e) => setClasificacion(e.target.value)}>
          <option value="">{t('comun.todas')}</option>
          <option value="NIC41">{t('auditoria.clase_NIC41')}</option>
          <option value="TECNICO">{t('auditoria.clase_TECNICO')}</option>
        </Select>
        <SelectorActivo id="auditoria-activo" activos={activos} cargando={cargandoActivos} value={texto} onChange={(x, id) => { setTexto(x); setIdActivo(id); }} />
        <Input id="auditoria-desde" label={t('comun.desde')} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <Input id="auditoria-hasta" label={t('comun.hasta')} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} error={rangoInvalido ? t('comun.rango_invalido') : undefined} />
        <div style={{ paddingBottom: 'var(--s1)' }}>
          <Button type="submit" variant="secondary" size="md" loading={lista.cargando}><Search size={16} aria-hidden />{t('comun.buscar')}</Button>
        </div>
      </form>
      {(lista.error ?? exportacion.error) && <Alert variant="error" title={(lista.error ?? exportacion.error)!.message} style={{ marginBottom: 'var(--s4)' }} />}

      {!lista.cargando && !lista.error && items.length === 0 ? (
        <EstadoVacio icono={<ScrollText size={28} aria-hidden />} titulo={t('auditoria.vacio_titulo')} detalle={t('auditoria.vacio_detalle')} />
      ) : (
        <>
          <ScrollRegion label={t('auditoria.titulo')}>
            <table style={TABLA} aria-busy={lista.cargando}>
              <thead>
                <tr>
                  <th style={TH}>{t('comun.fecha')}</th>
                  <th style={TH}>{t('auditoria.operacion')}</th>
                  <th style={TH}>{t('auditoria.entidad')}</th>
                  <th style={TH}>{t('comun.activo')}</th>
                  <th style={TH_NUM}>{t('auditoria.costo')}</th>
                  <th style={TH}>{t('auditoria.resultado')}</th>
                  <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id_auditoria_suministro}>
                    <td style={TD}>{formatoFecha(e.fecha_evento, true)}<div style={SECUNDARIO}>{t('auditoria.usuario_n', { id: e.id_usuario })}</div></td>
                    <td style={TD}>{t(`evento.${e.tipo_operacion}`, { defaultValue: e.tipo_operacion })}</td>
                    <td style={TD}>{e.entidad_afectada}</td>
                    <td style={TD}>{e.id_activo_biologico ? `#${e.id_activo_biologico}` : '—'}</td>
                    <td style={TD_NUM}>{e.costo_afectado ? formatoMoneda(e.costo_afectado) : '—'}</td>
                    <td style={TD}><EstadoRegistroBadge estado={e.resultado} /></td>
                    <td style={TD}>
                      <Button variant="ghost" size="sm" onClick={() => { detalle.limpiar(); setVerId(e.id_auditoria_suministro); }}>
                        <Eye size={16} aria-hidden />{t('comun.ver')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          {data && <Paginacion pagina={data.pagina} totalPaginas={Math.ceil(data.total / data.registros_por_pagina)} total={data.total} onCambiar={(p) => setFiltros((f) => ({ ...f, pagina: p }))} />}
        </>
      )}

      {verId !== null && <EventoAuditoriaModal evento={detalle.data} cargando={detalle.cargando} error={detalle.error} onCerrar={() => setVerId(null)} />}
    </>
  );
}
