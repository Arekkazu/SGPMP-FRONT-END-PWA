// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-110: grafo de la finca y edición de sus relaciones entre áreas |
import React, { useState } from 'react';
import { Plus, Share2, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useAristasFinca } from '../hooks/useAristasFinca';
import { topologiaApi, VIAS, type AristaPayload, type AristaTopologia } from '../api/topologiaApi';
import { GrafoTopologia } from './GrafoTopologia';
import type { ApiError } from '../../shared/api/errors';
import type { InfraestructuraResponse } from '../types';

// RF-110: recurso 87 topologia_sanitaria.
const RECURSO = 87;

/** Topología sanitaria de una finca: el grafo completo y, con permiso, crear, editar o quitar relaciones. */
export function TopologiaSanitaria({ idFinca, areas }: { idFinca: number; areas: InfraestructuraResponse[] }) {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear = usePermission(RECURSO, 1);
  const puedeEditar = usePermission(RECURSO, 3);
  const { aristas, error, recargar } = useAristasFinca(idFinca);
  // null: cerrado · 'nueva' · la arista que se edita
  const [modal, setModal] = useState<AristaTopologia | 'nueva' | null>(null);

  return (
    <section aria-labelledby="topologia-finca" style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s5)', marginTop: 'var(--s5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div>
          <h3 id="topologia-finca" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('topologia.titulo_finca')}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 'var(--s1) 0 0' }}>{t('topologia.descripcion_finca')}</p>
        </div>
        {puedeCrear && (
          <Button variant="primary" size="sm" onClick={() => setModal('nueva')} disabled={!online || areas.filter((a) => a.es_activo).length < 2}>
            <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('topologia.nueva')}
          </Button>
        )}
      </div>
      <div style={{ marginTop: 'var(--s3)' }}>
        {error
          ? <Alert variant="error" title={t('topologia.error')} description={error.message} />
          : <GrafoTopologia
              titulo={t('topologia.titulo_finca')}
              nodos={areas.map((i) => ({ id: i.id_infraestructura, nombre: i.nombre_infraestructura, activo: i.es_activo, detalle: i.tipo_area }))}
              aristas={aristas}
              onEditar={puedeEditar && online ? (a) => setModal(a) : undefined}
            />}
      </div>
      {modal && (
        <RelacionModal
          arista={modal === 'nueva' ? null : modal}
          areas={areas.filter((a) => a.es_activo)}
          onClose={() => setModal(null)}
          onGuardado={() => { setModal(null); recargar(); }}
        />
      )}
    </section>
  );
}

function RelacionModal({ arista, areas, onClose, onGuardado }: {
  arista: AristaTopologia | null; areas: InfraestructuraResponse[]; onClose: () => void; onGuardado: () => void;
}) {
  const { t } = useT('configuration');
  const dialogRef = useModalA11y(onClose);
  const puedeQuitar = usePermission(RECURSO, 4);
  const [origen, setOrigen] = useState(String(arista?.origen ?? ''));
  const [destino, setDestino] = useState(String(arista?.destino ?? ''));
  const [via, setVia] = useState(arista?.via ?? 'PROXIMIDAD');
  const [bidireccional, setBidireccional] = useState(arista?.bidireccional ?? false);
  const [intensidad, setIntensidad] = useState(String(arista?.intensidad ?? '0.5'));
  const [barrera, setBarrera] = useState(String(arista?.barrera ?? '1'));
  const [descripcion, setDescripcion] = useState(arista?.descripcion ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const correr = async (accion: () => Promise<unknown>) => {
    setSaving(true);
    setError(null);
    try {
      await accion();
      onGuardado();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const guardar = () => {
    const i = Number(intensidad), b = Number(barrera);
    if (!arista && (!origen || !destino)) return setError(t('topologia.falta_area'));
    if (origen === destino) return setError(t('topologia.misma_area'));
    if (!(i > 0 && i <= 1) || !(b >= 0 && b <= 1)) return setError(t('topologia.rango_invalido'));
    const datos: AristaPayload = {
      via, direccion: bidireccional ? 'BIDIRECCIONAL' : 'DIRIGIDA', intensidad: i, factor_barrera: b, descripcion: descripcion.trim() || null,
    };
    return correr(() => (arista ? topologiaApi.editar(arista.id, datos) : topologiaApi.registrar(Number(origen), Number(destino), datos)));
  };

  const opcionesArea = areas.map((a) => <option key={a.id_infraestructura} value={a.id_infraestructura}>{a.nombre_infraestructura}</option>);
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="relacion-titulo" className="ds-modal" style={{ zIndex: 1010 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ds-modal__panel ds-modal__panel--sm" style={{ padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s4)' }}>
          <h2 id="relacion-titulo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Share2 size={18} color="var(--brand-500)" aria-hidden />{t(arista ? 'topologia.editar_titulo' : 'topologia.nueva')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('topologia.cerrar')}><X size={18} aria-hidden /></Button>
        </div>
        {error && <Alert variant="error" title={t('topologia.error_guardar')} description={error} style={{ marginBottom: 'var(--s4)' }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)' }}>
            <Select id="relacion-origen" label={t('topologia.origen')} required value={origen} onChange={(e) => setOrigen(e.target.value)} disabled={!!arista || saving}>
              <option value="">{t('topologia.elegir_area')}</option>{opcionesArea}
            </Select>
            <Select id="relacion-destino" label={t('topologia.destino')} required value={destino} onChange={(e) => setDestino(e.target.value)} disabled={!!arista || saving}>
              <option value="">{t('topologia.elegir_area')}</option>{opcionesArea}
            </Select>
          </div>
          <Select id="relacion-via" label={t('topologia.via')} value={via} onChange={(e) => setVia(e.target.value)} disabled={saving}>
            {VIAS.map((v) => <option key={v} value={v}>{t(`topologia.via_${v}`)}</option>)}
          </Select>
          <Select id="relacion-direccion" label={t('topologia.direccion')} value={bidireccional ? 'B' : 'D'} onChange={(e) => setBidireccional(e.target.value === 'B')} disabled={saving}>
            <option value="D">{t('topologia.direccion_dirigida')}</option>
            <option value="B">{t('topologia.direccion_bidireccional')}</option>
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--s4)' }}>
            <Input id="relacion-intensidad" type="number" min={0.05} max={1} step={0.05} label={t('topologia.intensidad')} hint={t('topologia.intensidad_ayuda')}
              value={intensidad} onChange={(e) => setIntensidad(e.target.value)} disabled={saving} required />
            <Input id="relacion-barrera" type="number" min={0} max={1} step={0.05} label={t('topologia.barrera')} hint={t('topologia.barrera_ayuda')}
              value={barrera} onChange={(e) => setBarrera(e.target.value)} disabled={saving} />
          </div>
          <Input id="relacion-descripcion" label={t('topologia.descripcion')} maxLength={200} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={saving} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)', marginTop: 'var(--s5)', flexWrap: 'wrap' }}>
          <div>{arista && puedeQuitar && <Button variant="danger" size="md" onClick={() => correr(() => topologiaApi.desactivar(arista.id))} disabled={saving}>{t('topologia.quitar')}</Button>}</div>
          <div style={{ display: 'flex', gap: 'var(--s3)' }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>{t('topologia.cancelar')}</Button>
            <Button variant="primary" size="md" loading={saving} onClick={guardar}>{t('topologia.guardar')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
