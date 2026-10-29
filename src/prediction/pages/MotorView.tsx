// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-65: historial de cambios, aviso de modo de campo sin nodos y nodos sin confirmar |
// | 2026-10-23 | Arekkazu | DEV-36 RF-65: envía la config_version leída (concurrencia optimista) |
// | 2026-10-29 | Arekkazu | TC-DIS-168 RF-65 a11y 4.1.2: pestañas de tipo_modelo controlan su tabpanel |
import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { SlidersHorizontal, RefreshCw, Cpu, History } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useMotor } from '../hooks/useMotor';
import { MotorConfigForm } from '../components/MotorConfigForm';
import { MotorHistorialModal } from '../components/MotorHistorialModal';
import { ModalShell } from '../components/ModalShell';
import { PermissionDenied } from '../components/PermissionDenied';
import { AvisoSincronizacionGuardado, SincronizacionNodosPanel } from '../components/SincronizacionNodosPanel';
import { RECURSO_MOTOR, RECURSO_AUDITORIA, ACCION_R, ACCION_C } from '../rbac';
import { TIPOS_MODELO, TIPO_MODELO_LABEL, type TipoModelo, type ConfigurarMotorDTO } from '../types';

export function MotorView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_MOTOR, ACCION_R);
  const puedeEditar = usePermission(RECURSO_MOTOR, ACCION_C);
  // El historial sale de la bitácora M04: sin lectura de auditoría no hay de dónde leerlo.
  const puedeVerHistorial = usePermission(RECURSO_AUDITORIA, ACCION_R);
  const online = useOnlineStatus();

  const {
    configs, versiones, loading, saving, error, saveError, fromCache, cargar, guardar, limpiarSaveError,
    sincronizacion, syncError, ultimoGuardado, cargarSincronizacion,
    historial, historialLoading, historialError, cargarHistorial,
  } = useMotor();
  const [tipo, setTipo] = useState<TipoModelo>('MODELO_AVES');
  const [verHistorial, setVerHistorial] = useState(false);

  useEffect(() => { if (puedeVer) cargar(); }, [puedeVer, cargar]);
  // DEV-09: el estado por nodo es de la configuración de la pestaña visible.
  useEffect(() => { if (puedeVer && online) cargarSincronizacion(tipo); }, [puedeVer, online, tipo, cargarSincronizacion]);

  const configActual = configs.find((c) => c.tipo_modelo === tipo) ?? null;
  const guardadoDeEstaPestana = ultimoGuardado?.config.tipo_modelo === tipo ? ultimoGuardado : null;
  const nodosSinConfirmar = (sincronizacion?.nodos ?? []).filter((n) => n.estado_sincronizacion !== 'APLICADA').map((n) => n.serial);

  const abrirHistorial = () => {
    if (!configActual) return;
    cargarHistorial(configActual.id_configuracion_motor);
    setVerHistorial(true);
  };

  const onGuardar = async (dto: ConfigurarMotorDTO) => {
    // DEV-36 (RF-65 CA-9): la versión leída; si otro usuario guardó antes, el backend responde 412.
    const ok = await guardar({ ...dto, config_version: configActual?.config_version ?? null });
    if (ok) cargar();
  };

  if (!puedeVer) return <PermissionDenied seccion="Configuración del motor" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <SlidersHorizontal size={20} aria-hidden />{t('motorview.configuracion_del_motor_de_prediccion')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {t('motorview.descripcion_v2')}
            {fromCache && ` · ${t('motorview.desde_cache')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          {puedeVerHistorial && (
            <Button variant="secondary" size="sm" onClick={abrirHistorial} disabled={!configActual || !online}>
              <History size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('motorview.ver_historial')}</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { limpiarSaveError(); cargar(); }} aria-label={t('motorview.recargar')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {!online && <Alert variant="warning" title={t('motorview.sin_conexion')} description={t('motorview.mostrando_configuracion_cacheada_los')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('motorview.datos_desde_cache')} description="No se pudo conectar; se muestra la última configuración disponible." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('motorview.sin_acceso_a_la_configuracion') : t('motorview.error_al_cargar_la_configuracion')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
        {!puedeEditar && !error && <Alert variant="info" title={t('motorview.solo_lectura')} description={t('motorview.tu_rol_puede_consultar_la_configuracion')} style={{ marginBottom: 'var(--s4)' }} />}

        {/* Tabs por tipo de modelo */}
        <div role="tablist" aria-label={t('motorview.tipo_de_modelo')} style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          {TIPOS_MODELO.map((opcion) => {
            const activo = opcion === tipo;
            const tieneConfig = configs.some((c) => c.tipo_modelo === opcion);
            return (
              <button
                key={opcion}
                id={`motor-tab-${opcion}`}
                role="tab"
                aria-selected={activo}
                aria-controls="motor-panel"
                tabIndex={activo ? 0 : -1}
                onClick={() => setTipo(opcion)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)',
                  padding: 'var(--s2) var(--s4)', borderRadius: 'var(--r-full)',
                  border: `1.5px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                  background: activo ? 'var(--brand-50)' : 'var(--surface-card)',
                  color: activo ? 'var(--brand-700)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: activo ? 700 : 600, cursor: 'pointer', minHeight: 38,
                }}
              >
                {TIPO_MODELO_LABEL[opcion]}
                {tieneConfig && <><span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} /><span className="ds-sr-only">{t('motorview.configurado')}</span></>}
              </button>
            );
          })}
        </div>

        <div id="motor-panel" role="tabpanel" aria-labelledby={`motor-tab-${tipo}`}>
        {loading ? (
          <div style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('motorview.cargando_configuracion')}</div>
        ) : (
          <>
            {!configActual && (
              <Alert variant="info" title={t('motorview.sin_configuracion')} description={`No hay una configuración guardada para "${TIPO_MODELO_LABEL[tipo]}". Ajusta los valores por defecto y guarda para crearla.`} style={{ marginBottom: 'var(--s4)' }} />
            )}
            {guardadoDeEstaPestana && <AvisoSincronizacionGuardado resultado={guardadoDeEstaPestana} />}
            <MotorConfigForm
              key={tipo}
              tipoModelo={tipo}
              config={configActual}
              versiones={versiones}
              saving={saving}
              saveError={saveError}
              online={online}
              puedeEditar={puedeEditar}
              nodosSinConfirmar={nodosSinConfirmar}
              onGuardar={onGuardar}
            />
          </>
        )}
        </div>

        {/* Estado de la configuración en cada nodo Edge (DEV-09) */}
        <section style={{ marginTop: 'var(--s7)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
            <Cpu size={18} aria-hidden />{t('motorview.sincronizacion_de_nodos_edge')}</h2>
          <SincronizacionNodosPanel sincronizacion={sincronizacion} error={syncError} />
        </section>
      </div>

      {verHistorial && (
        <MotorHistorialModal eventos={historial} loading={historialLoading} error={historialError} onClose={() => setVerHistorial(false)} />
      )}

      {/* FA-08 / E3: modo de campo sin nodos con el modelo disponible */}
      {saveError?.code === 'MODO_EDGE_SIN_NODOS' && (
        <ModalShell
          title={t('motorview.edge_sin_modelo_titulo')}
          onClose={limpiarSaveError}
          maxWidth={440}
          footer={<Button variant="primary" onClick={limpiarSaveError}>{t('motorview.entendido')}</Button>}
        >
          <p style={{ margin: '0 0 var(--s3)', fontSize: '14px', color: 'var(--text-primary)' }}>{saveError.message}</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{t('motorview.edge_sin_modelo_sugerencia')}</p>
        </ModalShell>
      )}
    </div>
  );
}
