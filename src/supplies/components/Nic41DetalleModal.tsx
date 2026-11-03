// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-79: detalle de un reporte consolidado NIC-41 |
import React, { useEffect, useState } from 'react';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Alert } from '../../shared/design-system/Alert';
import { ScrollRegion } from '../../shared/design-system/ScrollRegion';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { formatoCantidad, formatoFecha, formatoMoneda } from '../lib/formato';
import type { ProvisionNic41 } from '../types';
import { Paginacion } from './Paginacion';
import { SECUNDARIO, TABLA, TD, TD_NUM, TH, TH_NUM } from './estilos';

interface Props {
  provision: ProvisionNic41 | null;
  cargando: boolean;
  error: ApiError | null;
  onPagina: (pagina: number) => void;
  onCerrar: () => void;
}

const POR_PAGINA = 50;

export function Nic41DetalleModal({ provision: p, cargando, error, onPagina, onCerrar }: Props) {
  const { t } = useT('supplies');
  const [pagina, setPagina] = useState(1);
  useEffect(() => { onPagina(pagina); }, [pagina, onPagina]);

  return (
    <ModalShell title={p ? t('nic41.detalle_titulo', { version: p.version_reporte }) : t('nic41.detalle')} onClose={onCerrar} maxWidth={720}>
      {error && <Alert variant="error" title={error.message} />}
      {!p ? <p style={SECUNDARIO}>{cargando ? t('comun.cargando') : ''}</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          {p.es_reporte_potencialmente_incompleto && <Alert variant="warning" title={t('nic41.incompleto')} description={t('nic41.incompleto_detalle')} />}
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--s4)', margin: 0 }}>
            {[
              [t('nic41.monto'), formatoMoneda(p.monto_provision)],
              [t('nic41.modalidad'), t(`nic41.modalidad_${p.modalidad}`, { defaultValue: p.modalidad })],
              [t('nic41.generado'), formatoFecha(p.fecha_generacion, true)],
              [t('nic41.entregado_m06'), p.fecha_entrega_m06 ? formatoFecha(p.fecha_entrega_m06, true) : t('nic41.no_entregado')],
            ].map(([k, v]) => (
              <div key={k}>
                <dt style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-muted)' }}>{k}</dt>
                <dd style={{ margin: 'var(--s1) 0 0', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{v}</dd>
              </div>
            ))}
          </dl>
          {p.motivo_correccion && <p style={{ ...SECUNDARIO, margin: 0, fontSize: 'var(--fs-body-md)' }}><strong>{t('nic41.motivo')}:</strong> {p.motivo_correccion}</p>}

          <table style={TABLA}>
            <caption style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 var(--s2)', color: 'var(--text-primary)' }}>{t('nic41.desglose')}</caption>
            <tbody>
              {Object.entries(p.desglose_categoria).map(([cat, monto]) => (
                <tr key={cat}><td style={TD}>{t(`tipo.${cat}`, { defaultValue: cat })}</td><td style={TD_NUM}>{formatoMoneda(monto)}</td></tr>
              ))}
            </tbody>
          </table>

          <ScrollRegion label={t('nic41.registros')}>
            <table style={TABLA} aria-busy={cargando}>
              <caption style={{ textAlign: 'left', fontWeight: 700, padding: '0 0 var(--s2)', color: 'var(--text-primary)' }}>{t('nic41.registros')}</caption>
              <thead>
                <tr>
                  <th style={TH}>{t('comun.fecha')}</th>
                  <th style={TH}>{t('historial.tipo')}</th>
                  <th style={TH}>{t('historial.operacion')}</th>
                  <th style={TH_NUM}>{t('historial.cantidad')}</th>
                  <th style={TH_NUM}>{t('historial.costo')}</th>
                </tr>
              </thead>
              <tbody>
                {p.lista_registros.map((r) => (
                  <tr key={r.id_registro_suministro}>
                    <td style={TD}>{formatoFecha(r.fecha_aplicacion)}</td>
                    <td style={TD}>{t(`tipo.${r.tipo_suministro}`, { defaultValue: r.tipo_suministro })}</td>
                    <td style={TD}>{t(`operacion.${r.tipo_operacion}`, { defaultValue: r.tipo_operacion })}</td>
                    <td style={TD_NUM}>{formatoCantidad(r.cantidad)} {r.unidad_medida}</td>
                    <td style={TD_NUM}>{formatoMoneda(r.costo_registro)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
          <Paginacion pagina={pagina} totalPaginas={Math.ceil(p.total_registros / POR_PAGINA)} total={p.total_registros} onCambiar={setPagina} />
          {p.hash_integridad && <p style={{ ...SECUNDARIO, margin: 0, wordBreak: 'break-all' }}>{t('nic41.hash')}: <code style={{ fontFamily: 'var(--font-mono)' }}>{p.hash_integridad}</code></p>}
        </div>
      )}
    </ModalShell>
  );
}
