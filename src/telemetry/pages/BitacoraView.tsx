import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, FileJson, FileText, ShieldCheck } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useAuditoriaIot } from '../hooks/useAuditoriaIot';
import { BitacoraFiltros, BITACORA_FILTROS_VACIO, type BitacoraFiltrosState } from '../components/BitacoraFiltros';
import { BitacoraTable } from '../components/BitacoraTable';
import { EventoAuditoriaModal } from '../components/EventoAuditoriaModal';
import { VerificarIntegridadModal } from '../components/VerificarIntegridadModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { RECURSO_BITACORA, ACCION_R, ACCION_E } from '../rbac';
import type { AuditoriaFiltros as AuditoriaFiltrosDTO, EventoAuditoriaIotSchema } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

export function BitacoraView() {
  const puedeVer = usePermission(RECURSO_BITACORA, ACCION_R);
  const puedeEjecutar = usePermission(RECURSO_BITACORA, ACCION_E);

  const { items, paginacion, loading, error, exportando, exportError, verificando, verificacion, verificarError, cargar, exportar, verificar, limpiarVerificacion } = useAuditoriaIot();
  const [filtros, setFiltros] = useState<BitacoraFiltrosState>(BITACORA_FILTROS_VACIO);
  const [seleccionado, setSeleccionado] = useState<EventoAuditoriaIotSchema | null>(null);
  const [modalVerificar, setModalVerificar] = useState(false);

  const build = useCallback(
    (pagina: number): AuditoriaFiltrosDTO => {
      const f: AuditoriaFiltrosDTO = { pagina, por_pagina: 50 };
      if (filtros.tipo_evento) f.tipo_evento = filtros.tipo_evento.trim();
      if (filtros.severidad_log) f.severidad_log = filtros.severidad_log;
      if (filtros.clasificacion_registro) f.clasificacion_registro = filtros.clasificacion_registro;
      if (filtros.resultado) f.resultado = filtros.resultado;
      if (filtros.entidad_afectada_id) f.entidad_afectada_id = filtros.entidad_afectada_id.trim();
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtros]
  );

  useEffect(() => { if (puedeVer) cargar({ pagina: 1, por_pagina: 50 }); }, [puedeVer, cargar]);

  const abrirVerificar = () => { limpiarVerificacion(); setModalVerificar(true); };

  if (!puedeVer) return <PermissionDenied seccion="Bitácora de auditoría IoT" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <ClipboardList size={20} aria-hidden />
            Bitácora de Auditoría IoT
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {loading ? 'Cargando…' : `${paginacion.totalRegistros} evento(s)`}
          </p>
        </div>
        {puedeEjecutar && (
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" loading={exportando} disabled={exportando} onClick={() => exportar(build(1), 'csv')}>
              <FileText size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />CSV
            </Button>
            <Button variant="secondary" size="sm" loading={exportando} disabled={exportando} onClick={() => exportar(build(1), 'json')}>
              <FileJson size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />JSON
            </Button>
            <Button variant="primary" size="sm" onClick={abrirVerificar}>
              <ShieldCheck size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />Verificar integridad
            </Button>
          </div>
        )}
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {error && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso a la bitácora' : 'Error al cargar la bitácora'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
        {exportError && <Alert variant="error" title="No se pudo exportar" description={exportError.message} style={{ marginBottom: 'var(--s4)' }} />}

        <BitacoraFiltros
          value={filtros}
          onChange={setFiltros}
          onAplicar={() => cargar(build(1))}
          onLimpiar={() => { setFiltros(BITACORA_FILTROS_VACIO); cargar({ pagina: 1, por_pagina: 50 }); }}
        />

        <BitacoraTable items={items} loading={loading} onAbrir={setSeleccionado} />

        <Paginacion pagina={paginacion.pagina} totalPaginas={paginacion.totalPaginas} totalRegistros={paginacion.totalRegistros} onCambiar={(p) => cargar(build(p))} />
      </div>

      {seleccionado && <EventoAuditoriaModal evento={seleccionado} onClose={() => setSeleccionado(null)} />}

      {modalVerificar && (
        <VerificarIntegridadModal
          verificando={verificando}
          verificacion={verificacion}
          verificarError={verificarError}
          onVerificar={verificar}
          onClose={() => setModalVerificar(false)}
        />
      )}
    </div>
  );
}
