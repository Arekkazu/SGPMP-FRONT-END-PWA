// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110 RF-68: mapa de propagación del contagio entre las áreas de una finca |
import React, { useEffect, useState } from 'react';
import { formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { usePermission } from '../../shared/rbac/usePermission';
import { useFincas } from '../../configuration/hooks/useFincas';
import { useAristasFinca } from '../../configuration/hooks/useAristasFinca';
import { infraestructurasApi } from '../../configuration/api/fincasApi';
import { GrafoTopologia } from '../../configuration/components/GrafoTopologia';
import { mapaPropagacion, type LoteContagio } from '../lib/contagio';
import { INPUT, LABEL } from './tableStyles';

const pct = (v: number) => formatearNumero(v, { style: 'percent', maximumFractionDigits: 1 });

export function MapaPropagacion({ lotes }: { lotes: LoteContagio[] }) {
  const { t } = useT('prediction');
  // RF-110: recurso 87 topologia_sanitaria.
  const puede = usePermission(87, 2);
  const { fincas, cargar } = useFincas();
  const [elegida, setElegida] = useState<number | null>(null);
  const [areas, setAreas] = useState<{ id: number; nombre: string; activo: boolean }[]>([]);

  useEffect(() => { if (puede) cargar(true); }, [puede, cargar]);
  const conLotes = fincas.filter((f) => lotes.some((l) => l.finca === f.nombre));
  const idFinca = elegida ?? conLotes[0]?.id_finca ?? null;
  const { aristas, error } = useAristasFinca(puede ? idFinca : null);

  useEffect(() => {
    if (idFinca == null) return;
    let vigente = true;
    infraestructurasApi.listarPorFinca(idFinca, true)
      .then((a) => { if (vigente) setAreas(a.map((i) => ({ id: i.id_infraestructura, nombre: i.nombre_infraestructura, activo: i.es_activo }))); })
      .catch(() => { if (vigente) setAreas([]); });
    return () => { vigente = false; };
  }, [idFinca]);

  if (!puede || conLotes.length === 0) return null;
  const { nodos, pasos } = mapaPropagacion(lotes, areas);
  const nombre = new Map(areas.map((a) => [a.id, a.nombre]));

  return (
    <section aria-labelledby="ctg-mapa" style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginBottom: 'var(--s5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div>
          <h2 id="ctg-mapa" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('contagio.mapa_titulo')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 0' }}>{t('contagio.mapa_descripcion')}</p>
        </div>
        {conLotes.length > 1 && (
          <div>
            <label style={LABEL} htmlFor="ctg-mapa-finca">{t('contagio.mapa_finca')}</label>
            <select id="ctg-mapa-finca" style={INPUT} value={idFinca ?? ''} onChange={(e) => setElegida(Number(e.target.value))}>
              {conLotes.map((f) => <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--s4)' }}>
        {error
          ? <Alert variant="error" title={t('contagio.mapa_error')} description={error.message} />
          : <GrafoTopologia
              titulo={t('contagio.mapa_titulo')}
              aristas={aristas}
              nodos={nodos.map((n) => ({
                ...n, detalle: n.nivel && n.probabilidad != null ? `${t(`contagio.nivel_${n.nivel}`)} · ${pct(n.probabilidad)}` : t('contagio.sin_calculo'),
              }))}
            />}
      </div>

      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 'var(--s4) 0 var(--s2)' }}>{t('contagio.mapa_pasos')}</h3>
      {pasos.length === 0
        ? <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>{t('contagio.mapa_sin_pasos')}</p>
        : (
          <ol style={{ margin: 0, paddingLeft: 'var(--s5)', display: 'flex', flexDirection: 'column', gap: 'var(--s1)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            {pasos.map((p) => (
              <li key={`${p.desde}-${p.hacia}-${p.via}`}>
                {t('contagio.mapa_paso', {
                  desde: nombre.get(p.desde) ?? `#${p.desde}`, hacia: nombre.get(p.hacia) ?? `#${p.hacia}`,
                  via: t(`topologia.via_${p.via}`, { ns: 'configuration', defaultValue: p.via }),
                  base: pct(p.pBase), total: pct(p.probabilidad), fecha: p.fecha,
                })}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}
