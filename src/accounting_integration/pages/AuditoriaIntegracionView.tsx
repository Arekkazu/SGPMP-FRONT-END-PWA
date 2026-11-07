// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-06 | Arekkazu | M07 RF-102: historial de la integración con integridad por registro y exportación |
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ShieldCheck } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import {
  EncabezadoVista, ErrorApi, EstadoVacio, TABLA, TD, TH, formatoFecha, guardarArchivo, useAsync,
} from '../../financial_valuation/components/comunes';
import { integracionApi } from '../api/integracionApi';
import { ACCION_E, ACCION_R, R_AUDITORIA, R_AUDITORIA_CIERRES } from '../rbac';
import type { EventoIntegracion, FiltrosAuditoria } from '../types';

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
const TAMANO = 50;

export function AuditoriaIntegracionView() {
  const { t } = useT('integracion');
  const completa = usePermissionPorNombre(R_AUDITORIA, ACCION_R);
  const restringida = usePermissionPorNombre(R_AUDITORIA_CIERRES, ACCION_R);
  const puedeExportar = usePermissionPorNombre(R_AUDITORIA, ACCION_E);
  const consulta = useAsync(integracionApi.auditoria);
  const exportacion = useAsync(integracionApi.exportarAuditoria);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({});
  const [pagina, setPagina] = useState(1);
  const puedeLeer = completa || restringida;
  const { ejecutar } = consulta;
  const cargar = useCallback(() => { if (puedeLeer) ejecutar(filtros, pagina, TAMANO); }, [puedeLeer, ejecutar, filtros, pagina]);
  useEffect(cargar, [cargar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;
  const tipos = completa ? TIPOS_EVENTO : TIPOS_AUDITOR;
  const total = consulta.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));
  const filtrar = (cambio: FiltrosAuditoria) => { setPagina(1); setFiltros({ ...filtros, ...cambio }); };
  const exportar = async (formato: 'csv' | 'json') => {
    const r = await exportacion.ejecutar(filtros, formato);
    if (r) guardarArchivo(r.blob, r.nombre);
  };

  return (
    <>
      <EncabezadoVista titulo={t('auditoria.titulo')} descripcion={t(completa ? 'auditoria.descripcion' : 'auditoria.descripcion_auditor')}
        acciones={puedeExportar && <>
          <Button variant="secondary" size="md" loading={exportacion.cargando} onClick={() => exportar('csv')}><Download size={18} aria-hidden />CSV</Button>
          <Button variant="secondary" size="md" loading={exportacion.cargando} onClick={() => exportar('json')}><Download size={18} aria-hidden />JSON</Button>
        </>} />
      <div style={{ display: 'grid', gap: 'var(--s4)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 'var(--s4)' }}>
        <Select label={t('auditoria.tipo')} value={filtros.tipo_evento ?? ''} onChange={(e) => filtrar({ tipo_evento: e.target.value || undefined })}>
          <option value="">{t('auditoria.todos')}</option>
          {tipos.map((x) => <option key={x} value={x}>{t(`evento.${x}`)}</option>)}
        </Select>
        <Input label={t('auditoria.desde')} type="date" value={filtros.desde ?? ''} onChange={(e) => filtrar({ desde: e.target.value || undefined })} />
        <Input label={t('auditoria.hasta')} type="date" value={filtros.hasta ?? ''} onChange={(e) => filtrar({ hasta: e.target.value || undefined })} />
        {completa && (
          <Select label={t('auditoria.respuesta')} value={filtros.codigo_http ?? ''} onChange={(e) => filtrar({ codigo_http: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('auditoria.todas')}</option>
            {CODIGOS_HTTP.map((c) => <option key={c} value={c}>{t(`http.${c}`)}</option>)}
          </Select>
        )}
      </div>
      <ErrorApi error={consulta.error ?? exportacion.error} />
      {consulta.data?.items.length === 0 ? (
        <EstadoVacio icono={<ShieldCheck size={28} aria-hidden />} titulo={t('auditoria.vacio_titulo')} detalle={t('auditoria.vacio_detalle')} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={TABLA}>
            <thead><tr>
              <th style={TH}>{t('auditoria.col_fecha')}</th><th style={TH}>{t('auditoria.col_evento')}</th>
              <th style={TH}>{t('auditoria.col_quien')}</th><th style={TH}>{t('auditoria.col_resultado')}</th>
              <th style={TH}>{t('auditoria.col_detalle')}</th><th style={TH}>{t('auditoria.col_integridad')}</th>
            </tr></thead>
            <tbody>
              {(consulta.data?.items ?? []).map((e) => <Fila key={e.id_evento_integracion} e={e} />)}
            </tbody>
          </table>
        </div>
      )}
      {total > TAMANO && (
        <nav aria-label={t('auditoria.paginacion')} style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', marginTop: 'var(--s4)' }}>
          <Button variant="ghost" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} aria-label={t('auditoria.anterior')}><ChevronLeft size={16} aria-hidden /></Button>
          <span>{t('auditoria.pagina', { pagina, paginas, total })}</span>
          <Button variant="ghost" size="sm" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)} aria-label={t('auditoria.siguiente')}><ChevronRight size={16} aria-hidden /></Button>
        </nav>
      )}
    </>
  );
}

function Fila({ e }: { e: EventoIntegracion }) {
  const { t } = useT('integracion');
  const ok = e.codigo_resultado === 'OK' || e.codigo_resultado === null;
  const quien = [e.nombre_cliente, e.correo_usuario].filter(Boolean).join(' · ') || t('auditoria.sistema');
  const detalle = [
    e.numero_id_tributaria && t('auditoria.productor', { nit: e.numero_id_tributaria }),
    e.fecha_desde && e.fecha_hasta && t('auditoria.rango', { desde: formatoFecha(e.fecha_desde), hasta: formatoFecha(e.fecha_hasta) }),
    e.version_contrato && t('auditoria.version', { version: e.version_contrato }),
    e.latencia_ms !== null && t('auditoria.latencia', { ms: e.latencia_ms }),
    e.ip_origen && t('auditoria.ip', { ip: e.ip_origen }),
  ].filter(Boolean);
  return (
    <tr>
      <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_evento, true)}</td>
      <td style={TD}>{t(`evento.${e.tipo_evento}`, { defaultValue: t('auditoria.evento_otro') })}</td>
      <td style={TD}>{quien}</td>
      <td style={TD}>
        <Badge variant={ok ? 'success' : e.codigo_http !== null && e.codigo_http >= 500 ? 'error' : 'warning'}>
          {ok ? t('auditoria.correcto') : t(`resultado.${e.codigo_resultado}`, { defaultValue: t('auditoria.rechazado') })}
        </Badge>
        {e.codigo_http !== null && <span className="fin-secundario">{t(`http.${e.codigo_http}`, { defaultValue: String(e.codigo_http) })}</span>}
      </td>
      <td style={TD}>{detalle.length ? detalle.map((d, i) => <span key={i} className="fin-secundario">{d}</span>) : t('auditoria.sin_detalle')}</td>
      <td style={TD}><Badge variant={e.integridad === 'INTEGRO' ? 'success' : 'error'}>{t(`integridad.${e.integridad}`)}</Badge></td>
    </tr>
  );
}
