import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadCloud, RefreshCw, Plus, CheckCircle2, XCircle, Clock, Package } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useOta } from '../hooks/useOta';
import { OtaTable } from '../components/OtaTable';
import { DespliegueDetalleModal } from '../components/DespliegueDetalleModal';
import { DatosSimuladosBanner } from '../components/DatosSimuladosBanner';
import { Paginacion } from '../components/Paginacion';
import { PermissionDenied } from '../components/PermissionDenied';
import { INPUT, LABEL, FILTER_GRID } from '../components/tableStyles';
import { RECURSO_OTA, ACCION_R } from '../rbac';
import { TIPOS_MODELO, TIPO_MODELO_LABEL, type ListarDesplieguesFiltros, type DespliegueOtaResponse } from '../types';

function Kpi({ icon, valor, etiqueta, color }: { icon: React.ReactNode; valor: number; etiqueta: string; color: string }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', color }}>
        {icon}<span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{valor}</span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)' }}>{etiqueta}</div>
    </div>
  );
}

export function DistribucionOtaView() {
  const puedeVer = usePermission(RECURSO_OTA, ACCION_R);
  const online = useOnlineStatus();

  const { despliegues, paginacion, loading, error, fromCache, cargar } = useOta();

  const [fEstado, setFEstado] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [sel, setSel] = useState<DespliegueOtaResponse | null>(null);

  const build = useCallback((): ListarDesplieguesFiltros => {
    const api: ListarDesplieguesFiltros = {};
    if (fEstado) api.estado = fEstado;
    return api;
  }, [fEstado]);

  useEffect(() => { if (puedeVer) cargar({}, 1); }, [puedeVer, cargar]);

  const visibles = useMemo(
    () => (fTipo ? despliegues.filter((d) => d.tipo_modelo === fTipo) : despliegues),
    [despliegues, fTipo]
  );

  const kpis = useMemo(() => ({
    total: paginacion.totalRegistros,
    completados: despliegues.filter((d) => d.estado_despliegue === 'EXITOSO').length,
    errores: despliegues.filter((d) => d.estado_despliegue === 'FALLIDO').length,
    pendientes: despliegues.filter((d) => d.estado_despliegue === 'PENDIENTE' || d.estado_despliegue === 'EN_PROCESO').length,
  }), [despliegues, paginacion.totalRegistros]);

  if (!puedeVer) return <PermissionDenied seccion="Distribución de modelos (OTA)" />;

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ padding: 'var(--s5) var(--s7)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <DownloadCloud size={20} aria-hidden />
            Distribución de Modelos (OTA)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            Estado de la distribución de versiones aprobadas a dispositivos de campo
            {fromCache && ' · desde caché'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => cargar(build(), paginacion.pagina)} aria-label="Recargar">
            <RefreshCw size={15} aria-hidden />
          </Button>
          <Button variant="primary" size="sm" disabled title="La creación de despliegues es gestionada por el motor de distribución (equipo IoT/IA)">
            <Plus size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} /> Nuevo despliegue
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--s7)' }}>
        <DatosSimuladosBanner detalle="La creación de despliegues y el monitor en vivo son del motor de distribución OTA (equipo IoT/IA). Esta vista muestra el estado real de lectura; el asistente de creación no está disponible" />

        {!online && <Alert variant="warning" title="Sin conexión" description="Mostrando despliegues cacheados." style={{ marginBottom: 'var(--s4)' }} />}
        {fromCache && online && <Alert variant="info" title="Datos desde caché" description="No se pudo conectar; se muestran los últimos despliegues disponibles." style={{ marginBottom: 'var(--s4)' }} />}
        {error && !fromCache && <Alert variant={error.status === 403 ? 'warning' : 'error'} title={error.status === 403 ? 'Sin acceso a la distribución' : 'Error al cargar despliegues'} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s6)' }}>
          <Kpi icon={<Package size={18} aria-hidden />} valor={kpis.total} etiqueta="Despliegues totales" color="var(--brand-500)" />
          <Kpi icon={<CheckCircle2 size={18} aria-hidden />} valor={kpis.completados} etiqueta="Completados (pág.)" color="var(--sem-success)" />
          <Kpi icon={<XCircle size={18} aria-hidden />} valor={kpis.errores} etiqueta="Con errores (pág.)" color="var(--sem-error)" />
          <Kpi icon={<Clock size={18} aria-hidden />} valor={kpis.pendientes} etiqueta="Pendientes (pág.)" color="var(--sem-warning)" />
        </div>

        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s5)' }}>
          <div style={FILTER_GRID}>
            <div>
              <label style={LABEL} htmlFor="ota-tipo">Tipo de modelo</label>
              <select id="ota-tipo" style={INPUT} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_MODELO.map((tipo) => <option key={tipo} value={tipo}>{TIPO_MODELO_LABEL[tipo]}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="ota-estado">Estado</label>
              <select id="ota-estado" style={INPUT} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="EXITOSO">Exitoso</option>
                <option value="FALLIDO">Fallido</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="SIN_CAMBIOS">Sin cambios</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => cargar(build(), 1)}>Aplicar</Button>
            </div>
          </div>
        </div>

        <OtaTable despliegues={visibles} loading={loading} onVer={setSel} />

        <Paginacion
          pagina={paginacion.pagina}
          totalPaginas={paginacion.totalPaginas}
          totalRegistros={paginacion.totalRegistros}
          onCambiar={(p) => cargar(build(), p)}
        />
      </div>

      {sel && <DespliegueDetalleModal despliegue={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
