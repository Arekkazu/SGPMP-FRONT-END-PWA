import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { SlidersHorizontal, RefreshCw, Cpu } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useMotor } from '../hooks/useMotor';
import { MotorConfigForm } from '../components/MotorConfigForm';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { PermissionDenied } from '../components/PermissionDenied';
import { Pill } from '../components/Pill';
import { TH, TD, TABLE_WRAP, THEAD_ROW } from '../components/tableStyles';
import { RECURSO_MOTOR, ACCION_R, ACCION_C } from '../rbac';
import { TIPOS_MODELO, TIPO_MODELO_LABEL, type TipoModelo, type ConfigurarMotorDTO } from '../types';

// Nodos Edge simulados — el backend solo modela el estado PENDIENTE (ver TASKS.md § Pendientes).
const NODOS_EDGE_MOCK = [
  { id: 'EDGE-001', ubicacion: 'Finca La Esperanza · Galpón 3', sync: 'hace 4 min', estado: 'SINCRONIZADO' },
  { id: 'EDGE-002', ubicacion: 'Finca La Esperanza · Estanque 1', sync: 'hace 12 min', estado: 'SINCRONIZADO' },
  { id: 'EDGE-003', ubicacion: 'Finca El Roble · Corral 2', sync: 'hace 2 h', estado: 'PENDIENTE' },
];

export function MotorView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_MOTOR, ACCION_R);
  const puedeEditar = usePermission(RECURSO_MOTOR, ACCION_C);
  const online = useOnlineStatus();

  const { configs, versiones, loading, saving, error, saveError, fromCache, cargar, guardar, limpiarSaveError } = useMotor();
  const [tipo, setTipo] = useState<TipoModelo>('ESPECIES_PEQUEÑAS');

  useEffect(() => { if (puedeVer) cargar(); }, [puedeVer, cargar]);

  const configActual = configs.find((c) => c.tipo_modelo === tipo) ?? null;

  const onGuardar = async (dto: ConfigurarMotorDTO) => {
    const ok = await guardar(dto);
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
            Umbrales, ventana de análisis y modo por tipo de modelo
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { limpiarSaveError(); cargar(); }} aria-label={t('motorview.recargar')}>
          <RefreshCw size={15} aria-hidden />
        </Button>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        {!online && <Alert variant="warning" title={t('motorview.sin_conexion')} description={t('motorview.mostrando_configuracion_cacheada_los')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('motorview.datos_desde_cache')} description="No se pudo conectar; se muestra la última configuración disponible." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('motorview.sin_acceso_a_la_configuracion') : t('motorview.error_al_cargar_la_configuracion')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
        {!puedeEditar && !error && <Alert variant="info" title={t('motorview.solo_lectura')} description={t('motorview.tu_rol_puede_consultar_la_configuracion')} style={{ marginBottom: 'var(--s4)' }} />}

        {/* Tabs por tipo de modelo */}
        <div role="tablist" aria-label={t('motorview.tipo_de_modelo')} style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', marginBottom: 'var(--s5)' }}>
          {TIPOS_MODELO.map((tipo) => {
            const activo = tipo === tipo;
            const tieneConfig = configs.some((c) => c.tipo_modelo === tipo);
            return (
              <button
                key={tipo}
                role="tab"
                aria-selected={activo}
                onClick={() => setTipo(tipo)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s2)',
                  padding: 'var(--s2) var(--s4)', borderRadius: 'var(--r-full)',
                  border: `1.5px solid ${activo ? 'var(--brand-500)' : 'var(--surface-border)'}`,
                  background: activo ? 'var(--brand-50)' : 'var(--surface-card)',
                  color: activo ? 'var(--brand-700)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: activo ? 700 : 600, cursor: 'pointer', minHeight: 38,
                }}
              >
                {TIPO_MODELO_LABEL[tipo]}
                {tieneConfig && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sem-success)' }} aria-label="configurado" />}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: 'var(--s8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{t('motorview.cargando_configuracion')}</div>
        ) : (
          <>
            {!configActual && (
              <Alert variant="info" title={t('motorview.sin_configuracion')} description={`No hay una configuración guardada para "${TIPO_MODELO_LABEL[tipo]}". Ajusta los valores por defecto y guarda para crearla.`} style={{ marginBottom: 'var(--s4)' }} />
            )}
            <MotorConfigForm
              key={tipo}
              tipoModelo={tipo}
              config={configActual}
              versiones={versiones}
              saving={saving}
              saveError={saveError}
              online={online}
              puedeEditar={puedeEditar}
              onGuardar={onGuardar}
            />
          </>
        )}

        {/* Panel de nodos Edge — simulado */}
        <section style={{ marginTop: 'var(--s7)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>
            <Cpu size={18} aria-hidden />{t('motorview.sincronizacion_de_nodos_edge')}</h2>
          <DatosSimuladosBanner detalle="La sincronización de nodos Edge se muestra con datos de ejemplo" />
          <div style={TABLE_WRAP}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={THEAD_ROW}>
                  <th style={TH}>{t('motorview.dispositivo')}</th>
                  <th style={TH}>{t('motorview.ubicacion')}</th>
                  <th style={TH}>{t('motorview.ultima_sincronizacion')}</th>
                  <th style={TH}>{t('motorview.estado')}</th>
                </tr>
              </thead>
              <tbody>
                {NODOS_EDGE_MOCK.map((n) => (
                  <tr key={n.id}>
                    <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{n.id}</td>
                    <td style={TD}>{n.ubicacion}</td>
                    <td style={TD}>{n.sync}</td>
                    <td style={TD}>
                      {n.estado === 'SINCRONIZADO'
                        ? <Pill tono="success">{t('motorview.sincronizado')}</Pill>
                        : <Pill tono="warning">{t('motorview.pendiente')}</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
