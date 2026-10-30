// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-70: KPIs con los totales reales de la flota y textos traducidos |
// | 2026-10-24 | Arekkazu | USAB-M03-M04 M4-09: tipo de modelo vacío se lee "Sin tipo" |
// | 2026-10-29 | Arekkazu | USAB-M04 prototipo RF-70: «Envío a campo» y marca de solo lectura para quien no envía |
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { DownloadCloud, RefreshCw, Plus, CheckCircle2, XCircle, Clock, Package } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Pill } from '../components/Pill';
import { useOta } from '../hooks/useOta';
import { useDistribucionOta } from '../hooks/useDistribucionOta';
import { OtaTable } from '../components/OtaTable';
import { DespliegueDetalleModal } from '../components/DespliegueDetalleModal';
import { DistribucionOtaFormModal } from '../components/DistribucionOtaFormModal';
import { DistribucionOtaProgreso } from '../components/DistribucionOtaProgreso';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { RECURSO_OTA, ACCION_R, ACCION_E } from '../rbac';
import { TIPOS_MODELO, TIPO_MODELO_LABEL, type ListarDesplieguesFiltros, type DespliegueOtaResponse, type CrearDistribucionOtaDTO, etiquetaTipoModelo } from '../types';

function Kpi({ icon, valor, etiqueta, sub, color }: { icon: React.ReactNode; valor: number | string; etiqueta: string; sub?: string; color: string }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function DistribucionOtaView() {
  const { t } = useT('prediction');
  const puedeVer = usePermission(RECURSO_OTA, ACCION_R);
  // DEV-15: lanzar una distribución exige Ejecutar sobre el recurso 44 (Administrador).
  const puedeLanzar = usePermission(RECURSO_OTA, ACCION_E);
  const online = useOnlineStatus();

  const { despliegues, paginacion, loading, error, fromCache, cargar, cargarPorVersion, versiones, cargarVersiones, resumen, cargarResumen } = useOta();
  const ota = useDistribucionOta(online);
  const [formAbierto, setFormAbierto] = useState(false);

  const abrirForm = () => {
    ota.limpiarLanzarError();
    void ota.cargarOpciones();
    setFormAbierto(true);
  };

  const onLanzar = async (dto: CrearDistribucionOtaDTO) => {
    const creada = await ota.lanzar(dto);
    if (creada) {
      setFormAbierto(false);
      consultar(1);
    }
  };

  const [fEstado, setFEstado] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fVersion, setFVersion] = useState('');
  const [sel, setSel] = useState<DespliegueOtaResponse | null>(null);

  const build = useCallback((): ListarDesplieguesFiltros => {
    const api: ListarDesplieguesFiltros = {};
    if (fEstado) api.estado = fEstado;
    return api;
  }, [fEstado]);

  /** Con versión: estado OTA de esa versión (`ota-status`); sin versión: listado paginado. */
  const consultar = useCallback((pagina: number) => {
    if (fVersion) cargarPorVersion(Number(fVersion), fEstado || undefined);
    else cargar(build(), pagina);
  }, [fVersion, fEstado, cargarPorVersion, cargar, build]);

  useEffect(() => {
    if (!puedeVer) return;
    cargar({}, 1);
    cargarVersiones();
    cargarResumen();
  }, [puedeVer, cargar, cargarVersiones, cargarResumen]);

  const visibles = useMemo(
    () => (fTipo ? despliegues.filter((d) => d.tipo_modelo === fTipo) : despliegues),
    [despliegues, fTipo]
  );

  if (!puedeVer) return <PermissionDenied seccion={t('distribucionotaview.titulo')} />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <DownloadCloud size={20} aria-hidden />
            {t('distribucionotaview.titulo')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            {t('distribucionotaview.descripcion')}
            {fromCache && ` · ${t('distribucionotaview.desde_cache')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => consultar(paginacion.pagina)} aria-label={t('distribucionotaview.recargar')}>
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeLanzar ? (
            <Button variant="primary" size="sm" onClick={abrirForm} disabled={!online}>
              <Plus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('distribucionotaview.nuevo_despliegue')}</Button>
          ) : <Pill tono="neutral">{t('distribucionotaview.solo_lectura')}</Pill>}
        </div>
      </div>

      <div style={{ padding: 'var(--page-pad)' }}>
        {ota.distribucion && (
          <>
            {ota.seguimientoError && <Alert variant="warning" title={t('distribucionprogreso.error_seguimiento')} description={ota.seguimientoError.message} style={{ marginBottom: 'var(--s4)' }} />}
            <DistribucionOtaProgreso
              distribucion={ota.distribucion}
              componentesPorNodo={ota.componentesPorNodo}
              dispositivos={ota.dispositivos}
              versiones={ota.versiones}
            />
          </>
        )}

        {!online && <Alert variant="warning" title={t('distribucionotaview.sin_conexion')} description={t('distribucionotaview.mostrando_despliegues_cacheados')} style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title={t('distribucionotaview.datos_desde_cache')} description="No se pudo conectar; se muestran los últimos despliegues disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? t('distribucionotaview.sin_acceso_a_la_distribucion') : t('distribucionotaview.error_al_cargar_despliegues')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<Package size={18} aria-hidden />} valor={resumen?.total ?? paginacion.totalRegistros} etiqueta={t('distribucionotaview.kpi_total')} color="var(--brand-500)" />
          <Kpi icon={<CheckCircle2 size={18} aria-hidden />} valor={resumen?.completados ?? '—'} etiqueta={t('distribucionotaview.kpi_completados')} sub={t('distribucionotaview.kpi_completados_sub')} color="var(--sem-success)" />
          <Kpi icon={<XCircle size={18} aria-hidden />} valor={resumen?.errores ?? '—'} etiqueta={t('distribucionotaview.kpi_errores')} sub={t('distribucionotaview.kpi_errores_sub')} color="var(--sem-error)" />
          <Kpi icon={<Clock size={18} aria-hidden />} valor={resumen?.pendientes ?? '—'} etiqueta={t('distribucionotaview.kpi_pendientes')} sub={t('distribucionotaview.kpi_pendientes_sub')} color="var(--sem-warning)" />
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
          <div style={FILTER_GRID}>
            <div>
              <label style={LABEL} htmlFor="ota-version">{t('distribucionotaview.version')}</label>
              <select id="ota-version" style={INPUT} value={fVersion} onChange={(e) => setFVersion(e.target.value)}>
                <option value="">{t('distribucionotaview.todas')}</option>
                {versiones.map((v) => (
                  <option key={v.id_version_modelo} value={v.id_version_modelo}>
                    {`${v.nombre_version} · ${etiquetaTipoModelo(v.tipo_modelo)}${v.componente ? ` · ${v.componente}` : ''}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="ota-tipo">{t('distribucionotaview.tipo_de_modelo')}</label>
              <select id="ota-tipo" style={INPUT} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option value="">{t('distribucionotaview.todos')}</option>
                {TIPOS_MODELO.map((tipo) => <option key={tipo} value={tipo}>{TIPO_MODELO_LABEL[tipo]}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="ota-estado">{t('distribucionotaview.estado')}</label>
              <select id="ota-estado" style={INPUT} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="">{t('distribucionotaview.todos')}</option>
                <option value="EXITOSO">{t('distribucionotaview.exitoso')}</option>
                <option value="FALLIDO">{t('distribucionotaview.fallido')}</option>
                <option value="PENDIENTE">{t('distribucionotaview.pendiente')}</option>
                <option value="EN_PROCESO">{t('distribucionotaview.en_proceso')}</option>
                <option value="SIN_CAMBIOS">{t('distribucionotaview.sin_cambios')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => consultar(1)}>{t('distribucionotaview.aplicar')}</Button>
            </div>
          </div>
        </div>

        <OtaTable despliegues={visibles} loading={loading} onVer={setSel} />

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => consultar(p)}
        />
      </div>

      {sel && <DespliegueDetalleModal despliegue={sel} onClose={() => setSel(null)} />}
      {formAbierto && (
        <DistribucionOtaFormModal
          versiones={ota.versiones}
          dispositivos={ota.dispositivos}
          lanzando={ota.lanzando}
          lanzarError={ota.lanzarError ?? ota.opcionesError}
          online={online}
          onLanzar={onLanzar}
          onClose={() => setFormAbierto(false)}
        />
      )}
    </div>
  );
}
