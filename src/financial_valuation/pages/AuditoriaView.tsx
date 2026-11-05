// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | M06 RF-94: consulta legible de la auditoría financiera con integridad por evento |
import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ScrollText } from 'lucide-react';
import { Select } from '../../shared/design-system/Select';
import { Badge } from '../../shared/design-system/Badge';
import { AccesoDenegado } from '../../shared/design-system/AccesoDenegado';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermissionPorNombre } from '../../shared/rbac/usePermission';
import { useT } from '../../shared/i18n/useT';
import { finanzasApi } from '../api/finanzasApi';
import { ACCION_R, R_AUDITORIA } from '../rbac';
import type { Periodo } from '../types';
import {
  EncabezadoVista, EstadoVacio, ErrorApi, FILTROS, Paginacion, SECUNDARIO, SelectorPeriodo, TABLA, TD, TD_NUM, TH, TH_NUM,
  formatoFecha, formatoMoneda, useAsync,
} from '../components/comunes';

const SEVERIDADES = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const VARIANTE = { INFO: 'info', WARNING: 'warning', ERROR: 'error', CRITICAL: 'error' } as const;

export function AuditoriaView() {
  const { t } = useT('finanzas');
  const puedeLeer = usePermissionPorNombre(R_AUDITORIA, ACCION_R);
  const [idPeriodo, setIdPeriodo] = useState<number | null>(null);
  const [severidad, setSeveridad] = useState('');
  const [pagina, setPagina] = useState(1);
  const auditoria = useAsync(finanzasApi.auditoria);
  const { ejecutar } = auditoria;
  const elegir = useCallback((id: number | null, _p: Periodo | null) => { setIdPeriodo(id); setPagina(1); }, []);
  useEffect(() => {
    if (puedeLeer && idPeriodo) ejecutar({ id_periodo_contable: idPeriodo, severidad: severidad || undefined, pagina });
  }, [puedeLeer, idPeriodo, severidad, pagina, ejecutar]);

  if (!puedeLeer) return <AccesoDenegado seccion={t('tabs.auditoria')} />;
  const datos = auditoria.data;
  const eventos = datos?.eventos ?? [];

  return (
    <>
      <EncabezadoVista titulo={t('aud.titulo')} descripcion={t('aud.descripcion')} />
      <div style={{ ...FILTROS, marginBottom: 'var(--s5)' }}>
        <SelectorPeriodo id="aud-periodo" value={idPeriodo} onChange={elegir} autoseleccionar />
        <Select id="aud-severidad" label={t('aud.severidad')} value={severidad} onChange={(e) => { setSeveridad(e.target.value); setPagina(1); }}>
          <option value="">{t('comun.todas')}</option>
          {SEVERIDADES.map((s) => <option key={s} value={s}>{t(`severidad.${s}`)}</option>)}
        </Select>
      </div>
      <ErrorApi error={auditoria.error} />
      {eventos.length === 0 ? (
        <EstadoVacio icono={<ScrollText size={28} aria-hidden />} titulo={auditoria.cargando ? t('comun.cargando') : t('aud.vacio_titulo')} detalle={t('aud.vacio_detalle')} />
      ) : (
        <>
          <ScrollRegion label={t('aud.titulo')}>
            <table style={TABLA}>
              <thead>
                <tr>
                  <th style={TH}>{t('col.fecha')}</th><th style={TH}>{t('aud.evento')}</th><th style={TH}>{t('aud.actor')}</th>
                  <th style={TH}>{t('col.activo')}</th><th style={TH_NUM}>{t('col.monto')}</th><th style={TH}>{t('aud.severidad')}</th>
                  <th style={TH}>{t('aud.integridad')}</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id_evento}>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{formatoFecha(e.fecha_hora, true)}</td>
                    <td style={TD}>{t(`evento.${e.tipo_evento}`, { defaultValue: e.descripcion_evento })}</td>
                    <td style={TD}>{e.actor === 'Sistema automático' ? t('aud.sistema') : e.actor}</td>
                    <td style={TD}>{e.activo ?? '—'}</td>
                    <td style={TD_NUM}>{formatoMoneda(e.monto_afectado)}</td>
                    <td style={TD}><Badge variant={VARIANTE[e.severidad as keyof typeof VARIANTE] ?? 'neutral'}>{t(`severidad.${e.severidad}`, { defaultValue: e.severidad })}</Badge></td>
                    <td style={TD}>
                      {e.integridad_verificable
                        ? <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-success)' }}><ShieldCheck size={14} aria-hidden />{t('aud.integra')}</span>
                        : <span style={{ display: 'inline-flex', gap: 'var(--s1)', alignItems: 'center', color: 'var(--sem-error)' }}><ShieldAlert size={14} aria-hidden />{t('aud.sin_hash')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          <p style={{ ...SECUNDARIO, marginTop: 'var(--s2)' }}>{t('aud.orden')}</p>
          <Paginacion pagina={datos?.pagina_actual ?? 1} totalPaginas={Math.ceil((datos?.total_registros ?? 0) / (datos?.registros_por_pagina ?? 50))}
            total={datos?.total_registros} onCambiar={setPagina} />
        </>
      )}
    </>
  );
}
