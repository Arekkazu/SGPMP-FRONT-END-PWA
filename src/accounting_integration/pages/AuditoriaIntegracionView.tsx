// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-102: historial de la integración con integridad por registro y exportación |
// | 2026-11-14 | Arekkazu | FILTRO-FINCA RF-98: filtro por titular entre los de las fincas del usuario |
// | 2026-11-19 | Arekkazu | M7-11 RF-102: nombre de quien actuó y el motivo como detalle |
// | 2026-11-20 | Arekkazu | A11Y-M07 TC-DIS-274/275/276 RF-102: la tabla se desplaza con el teclado (ScrollRegion) |
// | 2026-11-22 | Arekkazu | A11Y2-M07 TC-DIS-274..276 RF-102: filtros de sistema y ruta, anuncios, detalle del evento y alerta de alterados |
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { Anunciador } from '../../shared/design-system/Anunciador';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import {
  BadgeTono, Datos, EncabezadoVista, ErrorApi, EstadoVacio, TABLA, TD, TH, formatoFecha, guardarArchivo, useAsync,
} from '../../financial_valuation/components/comunes';
import { integracionApi } from '../api/integracionApi';
import { ACCION_E, ACCION_R, R_AUDITORIA, R_AUDITORIA_CIERRES, R_CLIENTES } from '../rbac';
import type { EventoIntegracion, FiltrosAuditoria } from '../types';
import { SelectorTitular } from '../../shared/fincas/SelectorTitular';

// Catálogo del backend (enum_evento_integracion_tipo_evento): un valor fuera de él responde 400.
export const TIPOS_EVENTO = [
  'PAQUETE_AAEF_CONSULTADO', 'VISTA_AAEF_GENERADA', 'SOLICITUD_RECHAZADA', 'CREDENCIALES_EN_URL', 'RATE_LIMIT_EXCEDIDO',
  'TOKEN_CANAL_EMITIDO', 'TOKEN_CANAL_RECHAZADO', 'USUARIO_CREADO_M2M', 'USUARIO_ACTUALIZADO_M2M', 'ESTADO_USUARIO_CAMBIADO_M2M',
  'CLIENTE_REGISTRADO', 'CLIENTE_EDITADO', 'CLIENTE_SUSPENDIDO', 'CLIENTE_REACTIVADO', 'CLIENTE_REVOCADO', 'SECRETO_ROTADO',
  'CONTRATO_REGISTRADO', 'CONTRATO_ACTIVADO', 'CONTRATO_DEPRECADO', 'CONTRATO_INACTIVADO', 'CONTRATO_ACTIVACION_BLOQUEADA',
  'ANEXO_REGISTRADO', 'ANEXO_EN_REVISION', 'ANEXO_APROBADO', 'ANEXO_VALIDACION_FALLIDA',
  'INTENTO_MODIFICACION_AUDITORIA', 'ACCESO_AUDITORIA_DENEGADO', 'REGISTRO_AUDITORIA_CORRUPTO',
] as const;
const TIPOS_AUDITOR = ['PAQUETE_AAEF_CONSULTADO', 'VISTA_AAEF_GENERADA', 'CONTRATO_ACTIVADO'] as const;
const CODIGOS_HTTP = [200, 400, 401, 403, 404, 405, 410, 422, 429, 500, 503];
// RF-102: el backend filtra la ruta exacta que quedó en el evento.
const RUTAS: Record<string, string> = {
  '/integracion/aaef/productores/{nit}': 'consulta', '/integraciones/agrofusion/token': 'acceso', '/integracion/auditoria': 'auditoria',
};
const TAMANO = 50;
const NIT_VALIDO = /^\d{6,15}$/;

export function AuditoriaIntegracionView() {
  const { t } = useT('integracion');
  const completa = usePermissionPorNombre(R_AUDITORIA, ACCION_R);
  const restringida = usePermissionPorNombre(R_AUDITORIA_CIERRES, ACCION_R);
  const puedeExportar = usePermissionPorNombre(R_AUDITORIA, ACCION_E);
  const veClientes = usePermissionPorNombre(R_CLIENTES, ACCION_R);
  const consulta = useAsync(integracionApi.auditoria);
  const exportacion = useAsync(integracionApi.exportarAuditoria);
  const clientes = useAsync(integracionApi.clientes);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [pagina, setPagina] = useState(1);
  const [nit, setNit] = useState('');
  const [detalle, setDetalle] = useState<EventoIntegracion | null>(null);
  const [avisoExportacion, setAvisoExportacion] = useState('');
  const puedeLeer = completa || restringida;
  const { ejecutar } = consulta;
  const cargar = useCallback(() => { if (puedeLeer) ejecutar(filtros, pagina, TAMANO); }, [puedeLeer, ejecutar, filtros, pagina]);
  useEffect(cargar, [cargar]);
  const { ejecutar: cargarClientes } = clientes;
  useEffect(() => { if (completa && veClientes) cargarClientes(); }, [completa, veClientes, cargarClientes]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;
  const tipos = completa ? TIPOS_EVENTO : TIPOS_AUDITOR;
  const total = consulta.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const filtrar = (cambio: FiltrosAuditoria) => { setPagina(1); setFiltros({ ...filtros, ...cambio }); };
  // 4.1.3: el inicio y el fin de la exportación se anuncian (antes solo giraba el botón).
  const exportar = async (formato: 'csv' | 'json') => {
    const nombre = formato.toUpperCase();
    setAvisoExportacion(t('auditoria.exportando', { formato: nombre }));
    const r = await exportacion.ejecutar(filtros, formato);
    if (r) guardarArchivo(r.blob, r.nombre);
    setAvisoExportacion(r ? t('auditoria.exportado', { formato: nombre }) : '');
  };
  const items = consulta.data?.items ?? [];
  const alterados = items.filter((e) => e.integridad === 'CORRUPTO');

  return (
    <>
      <EncabezadoVista titulo={t('auditoria.titulo')} descripcion={t(completa ? 'auditoria.descripcion' : 'auditoria.descripcion_auditor')}
        acciones={puedeExportar && <>
          <Button variant="secondary" size="md" loading={exportacion.cargando} onClick={() => exportar('csv')}><Download size={18} aria-hidden />CSV</Button>
          <Button variant="secondary" size="md" loading={exportacion.cargando} onClick={() => exportar('json')}><Download size={18} aria-hidden />JSON</Button>
        </>} />
      <Anunciador mensaje={avisoExportacion} />
      {/* RF-102 §11.5: un registro alterado es una alerta crítica, con la severidad en texto y el camino al evento. */}
      {alterados.length > 0 && (
        <Alert variant="error" title={t('auditoria.alterados_titulo', { count: alterados.length })} description={t('auditoria.alterados_detalle')}
          accion={{ texto: t('auditoria.ver_evento_alterado'), href: `#evento-${alterados[0].id_evento_integracion}`, onClick: () => setDetalle(alterados[0]) }}
          style={{ marginBottom: 'var(--s4)' }} />
      )}
      <div style={{ display: 'grid', gap: 'var(--s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 'var(--s4)' }}>
        <Select label={t('auditoria.tipo')} value={filtros.tipo_evento ?? ''} onChange={(e) => filtrar({ tipo_evento: e.target.value || undefined })}>
          <option value="">{t('auditoria.todos')}</option>
          {tipos.map((x) => <option key={x} value={x}>{t(`evento.${x}`)}</option>)}
        </Select>
        <SelectorTitular id="aud-int-titular" value={nit} onChange={setNit}
          error={nit && !NIT_VALIDO.test(nit) ? t('auditoria.titular_invalido') : undefined}
          onConfirm={(v) => { if (!v || NIT_VALIDO.test(v)) filtrar({ numero_id_tributaria: v || undefined }); }} />
        <Input label={t('auditoria.desde')} type="date" value={filtros.desde ?? ''} onChange={(e) => filtrar({ desde: e.target.value || undefined })} />
        <Input label={t('auditoria.hasta')} type="date" value={filtros.hasta ?? ''} onChange={(e) => filtrar({ hasta: e.target.value || undefined })} />
        {completa && veClientes && (
          <Select label={t('auditoria.sistema_filtro')} value={filtros.id_cliente_externo ?? ''}
            onChange={(e) => filtrar({ id_cliente_externo: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('auditoria.todos')}</option>
            {(clientes.data ?? []).map((c) => <option key={c.id_cliente_externo} value={c.id_cliente_externo}>{c.nombre}</option>)}
          </Select>
        )}
        {completa && (
          <Select label={t('auditoria.ruta_filtro')} value={filtros.endpoint ?? ''} onChange={(e) => filtrar({ endpoint: e.target.value || undefined })}>
            <option value="">{t('auditoria.todas')}</option>
            {Object.entries(RUTAS).map(([r, clave]) => <option key={r} value={r}>{t(`ruta.${clave}`)}</option>)}
          </Select>
        )}
        {completa && (
          <Select label={t('auditoria.respuesta')} value={filtros.codigo_http ?? ''} onChange={(e) => filtrar({ codigo_http: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('auditoria.todas')}</option>
            {CODIGOS_HTTP.map((c) => <option key={c} value={c}>{t(`http.${c}`)}</option>)}
          </Select>
        )}
      </div>
      <ErrorApi error={consulta.error ?? exportacion.error} />
      {/* 4.1.3: cada filtro anuncia cuántos registros quedaron. */}
      <p role="status" className="fin-secundario" style={{ margin: '0 0 var(--s2)' }}>
        {consulta.data ? t('auditoria.encontrados', { count: total }) : ''}
      </p>
      {consulta.data?.items.length === 0 ? (
        <EstadoVacio icono={<ShieldCheck size={28} aria-hidden />} titulo={t('auditoria.vacio_titulo')} detalle={t('auditoria.vacio_detalle')} />
      ) : (
        <ScrollRegion label={t('auditoria.titulo')}>
          <table style={TABLA}>
            <thead><tr>
              <th style={TH}>{t('auditoria.col_fecha')}</th><th style={TH}>{t('auditoria.col_evento')}</th>
              <th style={TH}>{t('auditoria.col_quien')}</th><th style={TH}>{t('auditoria.col_resultado')}</th>
              <th style={TH}>{t('auditoria.col_detalle')}</th><th style={TH}>{t('auditoria.col_integridad')}</th>
            </tr></thead>
            <tbody>
              {items.map((e) => <Fila key={e.id_evento_integracion} e={e} onAbrir={() => setDetalle(e)} />)}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {total > TAMANO && (
        <nav aria-label={t('auditoria.paginacion')} style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', marginTop: 'var(--s4)' }}>
          <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label={t('auditoria.anterior')}><ChevronLeft size={16} aria-hidden /></Button>
          {/* 4.1.3: el cambio de página se anuncia; aria-current marca la página en la que está. */}
          <span role="status"><span aria-current="page">{t('auditoria.pagina', { pagina, paginas, total })}</span></span>
          <Button variant="ghost" size="sm" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label={t('auditoria.siguiente')}><ChevronRight size={16} aria-hidden /></Button>
        </nav>
      )}
      {detalle && <DetalleEvento e={detalle} onCerrar={() => setDetalle(null)} />}
    </>
  );
}

/** RF-102 / TC-DIS-275: el evento completo, con su identificador y la huella que se verifica al consultarlo. */
function DetalleEvento({ e, onCerrar }: { e: EventoIntegracion; onCerrar: () => void }) {
  const { t } = useT('integracion');
  return (
    <ModalShell title={t('auditoria.detalle_titulo', { evento: t(`evento.${e.tipo_evento}`, { defaultValue: t('auditoria.evento_otro') }) })} onClose={onCerrar} maxWidth={600}>
      <Datos filas={[
        [t('auditoria.det_identificador'), <code key="id" style={{ wordBreak: 'break-all' }}>{e.id_evento_integracion}</code>],
        [t('auditoria.det_tipo'), t(`evento.${e.tipo_evento}`, { defaultValue: t('auditoria.evento_otro') })],
        [t('auditoria.det_fecha'), formatoFecha(e.fecha_evento, true)],
        [t('auditoria.col_quien'), quienActuo(e, t)],
        [t('auditoria.col_resultado'), e.codigo_http !== null ? t(`http.${e.codigo_http}`, { defaultValue: String(e.codigo_http) }) : t('auditoria.correcto')],
        [t('auditoria.det_ruta'), e.endpoint ? (RUTAS[e.endpoint] ? t(`ruta.${RUTAS[e.endpoint]}`) : e.endpoint) : t('auditoria.det_sin_ruta')],
        [t('auditoria.col_integridad'), <IntegridadBadge key="int" e={e} />],
        [t('auditoria.det_huella'), <code key="hash" style={{ wordBreak: 'break-all', fontWeight: 400 }}>{e.hash_integridad ?? t('auditoria.det_sin_huella')}</code>],
      ]} />
    </ModalShell>
  );
}

function quienActuo(e: EventoIntegracion, t: (k: string) => string): string {
  return [e.nombre_cliente, e.nombre_usuario ?? e.correo_usuario].filter(Boolean).join(' · ') || t('auditoria.sistema');
}

function IntegridadBadge({ e }: { e: EventoIntegracion }) {
  const { t } = useT('integracion');
  return <BadgeTono tono={e.integridad === 'INTEGRO' ? 'success' : 'error'}>{t(`integridad.${e.integridad}`)}</BadgeTono>;
}

function Fila({ e, onAbrir }: { e: EventoIntegracion; onAbrir: () => void }) {
  const { t } = useT('integracion');
  const ok = e.codigo_resultado === 'OK' || e.codigo_resultado === null;
  const quien = quienActuo(e, t);
  // Lo que el evento guardó en palabras (motivo de una suspensión, justificación del anexo, causa de un rechazo).
  const texto = (clave: string) => (typeof e.json_detalle?.[clave] === 'string' ? (e.json_detalle[clave] as string) : null);
  const detalle = [
    e.numero_id_tributaria && t('auditoria.productor', { nit: e.numero_id_tributaria }),
    e.fecha_desde && e.fecha_hasta && t('auditoria.rango', { desde: formatoFecha(e.fecha_desde), hasta: formatoFecha(e.fecha_hasta) }),
    e.version_contrato && t('auditoria.version', { version: e.version_contrato }),
    e.latencia_ms !== null && t('auditoria.latencia', { ms: e.latencia_ms }),
    e.ip_origen && t('auditoria.ip', { ip: e.ip_origen }),
    texto('motivo'), texto('justificacion'), texto('mensaje'),
  ].filter(Boolean);
  return (
    <tr>
      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_evento, true)}</td>
      <td style={TD}>
        <button type="button" id={`evento-${e.id_evento_integracion}`} className="ds-enlace-boton" onClick={onAbrir} aria-haspopup="dialog">
          {t(`evento.${e.tipo_evento}`, { defaultValue: t('auditoria.evento_otro') })}
        </button>
      </td>
      <td style={TD}>{quien}</td>
      <td style={TD}>
        <BadgeTono tono={ok ? 'success' : e.codigo_http !== null && e.codigo_http >= 500 ? 'error' : 'warning'}>
          {ok ? t('auditoria.correcto') : t(`resultado.${e.codigo_resultado}`, { defaultValue: t('auditoria.rechazado') })}
        </BadgeTono>
        {e.codigo_http !== null && <span className="fin-secundario">{t(`http.${e.codigo_http}`, { defaultValue: String(e.codigo_http) })}</span>}
      </td>
      <td style={TD}>{detalle.length ? detalle.map((d, i) => <span key={i} className="fin-secundario">{d}</span>) : t('auditoria.sin_detalle')}</td>
      <td style={TD}><IntegridadBadge e={e} /></td>
    </tr>
  );
}
