import React, { useCallback, useEffect, useState } from 'react';
import { Link2, RefreshCw } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useVinculaciones } from '../hooks/useVinculaciones';
import { VinculacionesFiltros, VINCULACIONES_FILTROS_VACIO, type VinculacionesFiltrosState } from '../components/VinculacionesFiltros';
import { VinculacionesTable } from '../components/VinculacionesTable';
import { VinculacionDetalleModal } from '../components/VinculacionDetalleModal';
import { ResolverVinculacionModal } from '../components/ResolverVinculacionModal';
import { CorregirVinculacionModal } from '../components/CorregirVinculacionModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_VINCULACIONES, ACCION_R, ACCION_U } from '../rbac';
import type { VinculacionesFiltros as VincFiltrosDTO, VinculacionLecturaSchema } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

type Accion = 'resolver' | 'corregir' | null;

export function VinculacionesView() {
  const puedeVer = usePermission(RECURSO_VINCULACIONES, ACCION_R);
  const puedeGestionar = usePermission(RECURSO_VINCULACIONES, ACCION_U);
  const online = useOnlineStatus();

  const { items, paginacion, loading, saving, error, saveError, cargar, resolver, corregir } = useVinculaciones();
  const [filtros, setFiltros] = useState<VinculacionesFiltrosState>(VINCULACIONES_FILTROS_VACIO);
  const [seleccionada, setSeleccionada] = useState<VinculacionLecturaSchema | null>(null);
  const [accion, setAccion] = useState<Accion>(null);

  const build = useCallback(
    (pagina: number): VincFiltrosDTO => {
      const f: VincFiltrosDTO = { pagina, por_pagina: 50 };
      if (filtros.estado_vinculacion) f.estado_vinculacion = filtros.estado_vinculacion;
      if (filtros.mecanismo_vinculacion) f.mecanismo_vinculacion = filtros.mecanismo_vinculacion;
      if (filtros.id_telemetria) f.id_telemetria = Number(filtros.id_telemetria);
      if (filtros.id_infraestructura) f.id_infraestructura = Number(filtros.id_infraestructura);
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtros]
  );

  useEffect(() => { if (puedeVer) cargar({ pagina: 1, por_pagina: 50 }); }, [puedeVer, cargar]);

  const confirmarResolver = async (dto: Parameters<typeof resolver>[1]) => {
    if (!seleccionada) return;
    const ok = await resolver(seleccionada.id_vinculacion_lectura, dto);
    if (ok) { setAccion(null); setSeleccionada(null); cargar(build(paginacion.pagina)); }
  };

  const confirmarCorregir = async (dto: Parameters<typeof corregir>[1]) => {
    if (!seleccionada) return;
    const ok = await corregir(seleccionada.id_vinculacion_lectura, dto);
    if (ok) { setAccion(null); setSeleccionada(null); cargar(build(paginacion.pagina)); }
  };

  if (!puedeVer) return <PermissionDenied seccion="Vinculaciones" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <Link2 size={20} aria-hidden />
            Vinculación de Lecturas con Activos
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} vinculación(es)`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cargar(build(paginacion.pagina))} aria-label="Recargar"><RefreshCw size={15} aria-hidden /></Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title="Sin conexión" description="Resolver y corregir están deshabilitados." style={{ marginBottom: 'var(--s4)' }} />}
        {error && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso a vinculaciones' : 'Error al cargar vinculaciones'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <VinculacionesFiltros
          value={filtros}
          onChange={setFiltros}
          onAplicar={() => cargar(build(1))}
          onLimpiar={() => { setFiltros(VINCULACIONES_FILTROS_VACIO); cargar({ pagina: 1, por_pagina: 50 }); }}
        />

        <VinculacionesTable items={items} loading={loading} onAbrir={setSeleccionada} />

        <Paginacion pagina={paginacion.pagina} totalPaginas={paginacion.totalPaginas} totalRegistros={paginacion.totalRegistros} onCambiar={(p) => cargar(build(p))} />
      </div>

      {seleccionada && accion === null && (
        <VinculacionDetalleModal
          vinc={seleccionada}
          puedeGestionar={puedeGestionar}
          online={online}
          onResolver={() => setAccion('resolver')}
          onCorregir={() => setAccion('corregir')}
          onClose={() => setSeleccionada(null)}
        />
      )}

      {seleccionada && accion === 'resolver' && (
        <ResolverVinculacionModal vinc={seleccionada} saving={saving} saveError={saveError} onConfirm={confirmarResolver} onClose={() => setAccion(null)} />
      )}

      {seleccionada && accion === 'corregir' && (
        <CorregirVinculacionModal vinc={seleccionada} saving={saving} saveError={saveError} onConfirm={confirmarCorregir} onClose={() => setAccion(null)} />
      )}
    </div>
  );
}
