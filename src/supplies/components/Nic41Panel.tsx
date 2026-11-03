// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-79: consolidación y versiones del reporte NIC-41 por ciclo |
import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck2, Eye, PencilLine } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { usePermission } from '../../shared/rbac/usePermission';
import { avisarExito } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import { ACCION_E, RECURSO_NIC41 } from '../rbac';
import { useNic41 } from '../hooks/useCosteo';
import { formatoFecha, formatoMoneda } from '../lib/formato';
import type { ProvisionNic41 } from '../types';
import { EstadoRegistroBadge } from './EstadoRegistroBadge';
import { MotivoModal } from './MotivoModal';
import { Nic41DetalleModal } from './Nic41DetalleModal';
import { PANEL, SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from './estilos';

interface Props { idActivo: number; idGestionFasesActiva: number | null; online: boolean }

/** Solo se monta con permiso R sobre el recurso 56. */
export function Nic41Panel({ idActivo, idGestionFasesActiva, online }: Props) {
  const { t } = useT('supplies');
  const puedeEjecutar = usePermission(RECURSO_NIC41, ACCION_E);
  const { ciclos, versiones, consolidacion, detalle, correccion } = useNic41();
  const [idGestion, setIdGestion] = useState<number | null>(idGestionFasesActiva);
  const [verId, setVerId] = useState<number | null>(null);
  const [aCorregir, setACorregir] = useState<ProvisionNic41 | null>(null);

  const { ejecutar: cargarCiclos } = ciclos;
  useEffect(() => { cargarCiclos(idActivo); }, [idActivo, cargarCiclos]);
  const instancias = (ciclos.data ?? []).filter((c, i, arr) => c.id_gestion_fases !== null && arr.findIndex((x) => x.id_gestion_fases === c.id_gestion_fases) === i);
  useEffect(() => {
    if (idGestion === null && instancias.length > 0) setIdGestion(instancias[0].id_gestion_fases);
  }, [idGestion, instancias]);

  const { ejecutar: cargarVersiones } = versiones;
  useEffect(() => { if (idGestion !== null) cargarVersiones(idGestion); }, [idGestion, cargarVersiones]);

  const { ejecutar: cargarDetalle } = detalle;
  const paginaDetalle = useCallback((pagina: number) => { if (verId !== null) cargarDetalle(verId, pagina); }, [verId, cargarDetalle]);

  const seleccionada = instancias.find((c) => c.id_gestion_fases === idGestion);
  const lista = [...(versiones.data?.versiones ?? [])].sort((a, b) => b.version_reporte - a.version_reporte);
  const ultima = lista[0];

  const consolidar = async () => {
    if (idGestion === null) return;
    const r = await consolidacion.ejecutar(idGestion);
    if (r) { avisarExito('registrado', t('nic41.version', { n: r.version_reporte })); cargarVersiones(idGestion); }
  };

  return (
    <section aria-labelledby="nic41-titulo" style={{ ...PANEL, marginTop: 'var(--s7)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 id="nic41-titulo" style={{ margin: 0, fontSize: 'var(--fs-heading-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{t('nic41.titulo')}</h2>
          <p style={{ ...SECUNDARIO, margin: 'var(--s1) 0 0', fontSize: 'var(--fs-body-md)', maxWidth: '64ch' }}>{t('nic41.descripcion')}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 240 }}>
            <Select id="nic41-ciclo" label={t('nic41.ciclo')} value={idGestion ?? ''} onChange={(e) => setIdGestion(Number(e.target.value) || null)} disabled={instancias.length === 0}>
              {instancias.length === 0 && <option value="">{ciclos.cargando ? t('comun.cargando') : t('nic41.sin_ciclos')}</option>}
              {instancias.map((c) => (
                <option key={c.id_gestion_fases as number} value={c.id_gestion_fases as number}>
                  {`${c.nombre_ciclo} · ${formatoFecha(c.fecha_inicio)}${c.es_activa ? ` (${t('nic41.activo')})` : ''}`}
                </option>
              ))}
            </Select>
          </div>
          {puedeEjecutar && (
            <Button variant="primary" size="md" disabled={!online || !seleccionada || seleccionada.es_activa} loading={consolidacion.cargando} onClick={consolidar}
              title={seleccionada?.es_activa ? t('nic41.solo_cerrado') : undefined}>
              <FileCheck2 size={16} aria-hidden />{t('nic41.consolidar')}
            </Button>
          )}
        </div>
      </div>
      {seleccionada?.es_activa && puedeEjecutar && <p style={{ ...SECUNDARIO, margin: '0 0 var(--s4)' }}>{t('nic41.solo_cerrado')}</p>}
      {(consolidacion.error ?? versiones.error) && <Alert variant="warning" title={(consolidacion.error ?? versiones.error)!.message} style={{ marginBottom: 'var(--s4)' }} />}

      {lista.length === 0 ? (
        <p style={{ ...SECUNDARIO, margin: 0, fontSize: 'var(--fs-body-md)' }}>{versiones.cargando ? t('comun.cargando') : t('nic41.sin_versiones')}</p>
      ) : (
        <ScrollRegion label={t('nic41.versiones')}>
          <table style={TABLA} aria-busy={versiones.cargando}>
            <thead>
              <tr>
                <th style={TH}>{t('nic41.version_col')}</th>
                <th style={TH}>{t('nic41.generado')}</th>
                <th style={TH_NUM}>{t('nic41.monto')}</th>
                <th style={TH}>{t('comun.estado')}</th>
                <th style={TH}><span className="ds-sr-only">{t('comun.acciones')}</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id_provision ?? v.version_reporte}>
                  <td style={TD}>
                    v{v.version_reporte}
                    {v.motivo_correccion && <div style={{ ...SECUNDARIO, maxWidth: 320 }}>{v.motivo_correccion}</div>}
                  </td>
                  <td style={TD}>{formatoFecha(v.fecha_generacion, true)}</td>
                  <td style={TD_NUM}>{formatoMoneda(v.monto_provision)}</td>
                  <td style={TD}>
                    <EstadoRegistroBadge estado={v.estado} />
                    {v.es_reporte_potencialmente_incompleto && <div style={{ ...SECUNDARIO, color: 'var(--sem-warning)', marginTop: 'var(--s1)' }}>{t('nic41.incompleto')}</div>}
                  </td>
                  <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                    {v.id_provision !== null && (
                      <Button variant="ghost" size="sm" onClick={() => { detalle.limpiar(); setVerId(v.id_provision); }}>
                        <Eye size={16} aria-hidden />{t('comun.ver')}
                      </Button>
                    )}
                    {puedeEjecutar && v === ultima && v.id_provision !== null && (
                      <Button variant="ghost" size="sm" disabled={!online} onClick={() => { correccion.limpiar(); setACorregir(v); }}>
                        <PencilLine size={16} aria-hidden />{t('nic41.corregir')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}

      {verId !== null && (
        <Nic41DetalleModal provision={detalle.data} cargando={detalle.cargando} error={detalle.error} onPagina={paginaDetalle} onCerrar={() => setVerId(null)} />
      )}
      {aCorregir && (
        <MotivoModal
          titulo={t('nic41.corregir_titulo', { version: aCorregir.version_reporte })}
          descripcion={t('nic41.corregir_descripcion')}
          etiqueta={t('nic41.motivo')}
          confirmar={t('nic41.generar_version')}
          min={20} max={500}
          enviando={correccion.cargando}
          error={correccion.error}
          onCerrar={() => setACorregir(null)}
          onConfirmar={async (motivo) => {
            const r = await correccion.ejecutar(aCorregir.id_provision as number, motivo);
            if (r) { setACorregir(null); avisarExito('registrado', t('nic41.version', { n: r.version_reporte })); if (idGestion !== null) cargarVersiones(idGestion); }
          }}
        />
      )}
    </section>
  );
}
