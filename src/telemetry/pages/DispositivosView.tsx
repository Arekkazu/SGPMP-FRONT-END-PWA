import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Cpu, Search, Wrench, AlertTriangle } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useDispositivo } from '../hooks/useDispositivo';
import { useAlertas } from '../hooks/useAlertas';
import { DispositivoEstadoPanel } from '../components/DispositivoEstadoPanel';
import { AplicarMantenimientoModal } from '../components/AplicarMantenimientoModal';
import { AlertasFiltros, ALERTAS_FILTROS_VACIO, type AlertasFiltrosState } from '../components/AlertasFiltros';
import { AlertasTable } from '../components/AlertasTable';
import { AlertaDetalleModal } from '../components/AlertaDetalleModal';
import { CambiarEstadoAlertaModal } from '../components/CambiarEstadoAlertaModal';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { INPUT, LABEL } from '../components/tableStyles';
import { RECURSO_INFRAESTRUCTURA, RECURSO_ALERTAS_TECNICAS, ACCION_R, ACCION_U } from '../rbac';
import type { ListarAlertasFiltros, NuevoEstadoAlerta } from '../types';
import { finDelDiaUtc, inicioDelDiaUtc } from '../../shared/lib/fecha';

export function DispositivosView() {
  const { t } = useT('telemetry');
  const puedeVerInfra = usePermission(RECURSO_INFRAESTRUCTURA, ACCION_R);
  const puedeMantenimiento = usePermission(RECURSO_INFRAESTRUCTURA, ACCION_U);
  const puedeVerTecnicas = usePermission(RECURSO_ALERTAS_TECNICAS, ACCION_R);
  const puedeGestionarTecnicas = usePermission(RECURSO_ALERTAS_TECNICAS, ACCION_U);
  const online = useOnlineStatus();

  const dispositivo = useDispositivo();
  const [idInput, setIdInput] = useState('');
  const [mantAbierto, setMantAbierto] = useState(false);

  const tecnicas = useAlertas({ tecnicas: true });
  const [filtros, setFiltros] = useState<AlertasFiltrosState>(ALERTAS_FILTROS_VACIO);
  const [selId, setSelId] = useState<number | null>(null);
  const [accion, setAccion] = useState<NuevoEstadoAlerta | null>(null);

  const build = useCallback(
    (pagina: number): ListarAlertasFiltros => {
      const f: ListarAlertasFiltros = { pagina, por_pagina: 50 };
      if (filtros.estado) f.estado = filtros.estado;
      if (filtros.severidad) f.severidad = filtros.severidad;
      if (filtros.origen_evento) f.origen_evento = filtros.origen_evento;
      if (filtros.id_sensor) f.id_sensor = Number(filtros.id_sensor);
      if (filtros.fecha_desde) f.fecha_desde = inicioDelDiaUtc(filtros.fecha_desde);
      if (filtros.fecha_hasta) f.fecha_hasta = finDelDiaUtc(filtros.fecha_hasta);
      return f;
    },
    [filtros]
  );

  useEffect(() => {
    if (puedeVerTecnicas) tecnicas.cargar({ pagina: 1, por_pagina: 50 });
  }, [puedeVerTecnicas, tecnicas.cargar]); // eslint-disable-line react-hooks/exhaustive-deps

  const consultar = () => {
    const id = Number(idInput.trim());
    if (id > 0) dispositivo.cargar(id);
  };

  const confirmarMantenimiento = async (dto: Parameters<typeof dispositivo.aplicarMantenimiento>[0]) => {
    const ok = await dispositivo.aplicarMantenimiento(dto);
    if (ok) setMantAbierto(false);
  };

  const enMantenimiento = (dispositivo.estado?.estado_actual ?? '').toUpperCase() === 'EN_MANTENIMIENTO';

  // La técnica seleccionada se toma del propio listado (no hay endpoint de detalle
  // de alertas técnicas; el ítem del listado ya trae el schema completo).
  const seleccionada = selId != null ? tecnicas.alertas.find((a) => a.id_alerta === selId) ?? null : null;

  const confirmarCambio = async (dto: Parameters<typeof tecnicas.cambiarEstado>[1]) => {
    if (selId == null) return;
    const ok = await tecnicas.cambiarEstado(selId, dto);
    if (ok) {
      setAccion(null);
      setSelId(null);
      tecnicas.cargar(build(tecnicas.paginacion.pagina));
    }
  };

  if (!puedeVerInfra) return <PermissionDenied seccion="Estado de dispositivos" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          <Cpu size={20} aria-hidden />{t('dispositivosview.estado_de_dispositivos_iot')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('dispositivosview.consulta_el_estado_y_las_transiciones_de_un')}</p>
      </div>

      <div style={{ padding: 'var(--s7)', display: 'flex', flexDirection: 'column', gap: 'var(--s7)' }}>
        {/* Consulta de dispositivo */}
        <section>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
            <div style={{ maxWidth: 220 }}>
              <label style={LABEL} htmlFor="disp-id">{t('dispositivosview.id_de_dispositivo')}</label>
              <input
                id="disp-id"
                type="number"
                style={INPUT}
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') consultar(); }}
                placeholder="Ej: 12"
              />
            </div>
            <Button variant="primary" size="sm" onClick={consultar} disabled={!idInput.trim()}>
              <Search size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('dispositivosview.consultar')}</Button>
          </div>

          <DispositivoEstadoPanel
            idConsultado={dispositivo.idConsultado}
            estado={dispositivo.estado}
            historial={dispositivo.historial}
            loading={dispositivo.loading}
            error={dispositivo.error}
          />

          {dispositivo.estado && puedeMantenimiento && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', marginTop: 'var(--s4)' }}>
              <Button
                variant={enMantenimiento ? 'primary' : 'secondary'}
                size="sm"
                disabled={!online}
                onClick={() => { dispositivo.limpiarSaveError(); setMantAbierto(true); }}
              >
                <Wrench size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
                {enMantenimiento ? 'Reactivar dispositivo' : 'Poner en mantenimiento'}
              </Button>
              {!online && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('dispositivosview.requiere_conexion')}</span>
              )}
            </div>
          )}
        </section>

        {/* Alertas técnicas */}
        <section>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
            <AlertTriangle size={18} aria-hidden />{t('dispositivosview.alertas_tecnicas')}</h2>

          {!puedeVerTecnicas ? (
            <Alert variant="warning" title={t('dispositivosview.acceso_restringido')} description={t('dispositivosview.las_alertas_tecnicas_solo_estan_disponibles')} />
          ) : (
            <>
              {!online && <Alert variant="warning" title={t('dispositivosview.sin_conexion')} description={t('dispositivosview.la_gestion_de_alertas_tecnicas_esta')} style={{ marginBottom: 'var(--s4)' }} />}
              {tecnicas.error && <Alert variant={tecnicas.error.status === 403 ? 'warning' : 'error'} title={t('dispositivosview.error_al_cargar_alertas_tecnicas')} description={tecnicas.error.message} style={{ marginBottom: 'var(--s4)' }} />}

              <AlertasFiltros
                value={filtros}
                onChange={setFiltros}
                onAplicar={() => tecnicas.cargar(build(1))}
                onLimpiar={() => { setFiltros(ALERTAS_FILTROS_VACIO); tecnicas.cargar({ pagina: 1, por_pagina: 50 }); }}
                ocultarTipo
              />

              <AlertasTable alertas={tecnicas.alertas} loading={tecnicas.loading} onAbrir={setSelId} />

              <Paginacion
                pagina={tecnicas.paginacion.pagina}
                totalPaginas={tecnicas.paginacion.totalPaginas}
                totalRegistros={tecnicas.paginacion.totalRegistros}
                onCambiar={(p) => tecnicas.cargar(build(p))}
              />
            </>
          )}
        </section>
      </div>

      {seleccionada && (
        <AlertaDetalleModal
          detalle={{ ...seleccionada, historico_estados: [] }}
          loading={false}
          error={null}
          puedeGestionar={puedeGestionarTecnicas}
          online={online}
          onAccion={setAccion}
          onClose={() => setSelId(null)}
        />
      )}

      {accion && seleccionada && (
        <CambiarEstadoAlertaModal
          alerta={seleccionada}
          estado={accion}
          saving={tecnicas.saving}
          saveError={tecnicas.saveError}
          onConfirm={confirmarCambio}
          onClose={() => setAccion(null)}
        />
      )}

      {mantAbierto && dispositivo.estado && (
        <AplicarMantenimientoModal
          idDispositivo={dispositivo.estado.id_dispositivo_iot}
          estadoActual={dispositivo.estado.estado_actual}
          saving={dispositivo.saving}
          saveError={dispositivo.saveError}
          onConfirm={confirmarMantenimiento}
          onClose={() => setMantAbierto(false)}
        />
      )}
    </div>
  );
}
