// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-30 | Arekkazu | INC-M03-135-G01 RF-49: selector extraído de CalibracionSection para reutilizarlo |
import React from 'react';
import { Cpu } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { Buscador } from '../../shared/design-system/Buscador';
import { useBusqueda } from '../../shared/hooks/useBusqueda';
import type { DispositivoIotResponse } from '../types';

/** Dispositivos activos como tarjetas seleccionables, con buscador si son muchos. */
export function DispSelector({ dispositivos, loading, onSelect, idBuscador = 'buscar-disp-calibracion' }: {
  dispositivos: DispositivoIotResponse[]; loading: boolean; onSelect: (d: DispositivoIotResponse) => void; idBuscador?: string;
}) {
  const { t } = useT('configuration');
  const activos = dispositivos.filter((d) => d.es_activo);
  const busqueda = useBusqueda(activos, (d) => `${d.serial} ${d.descripcion ?? ''}`);
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: 90, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (activos.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: 'var(--s7) 0' }}>{t('calibracionsection.no_hay_dispositivos_activos_disponibles')}</p>;
  }
  return (
    <>
      {busqueda.conBuscador && (
        <Buscador id={idBuscador} label={t('busqueda.buscar_dispositivo', { ns: 'common' })} value={busqueda.consulta} onChange={busqueda.setConsulta} resultados={busqueda.filtrados.length} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s4)' }}>
        {busqueda.filtrados.map((d) => (
          <OptionCard key={d.id_dispositivo_iot} onClick={() => onSelect(d)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s3)' }}>
              <span className="ds-option__icono"><Cpu size={20} strokeWidth={1.5} aria-hidden /></span>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)' }}>{d.serial}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </>
  );
}
