import React, { useEffect, useState } from 'react';
import { formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { RefreshCw, Download, Archive, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuditoria } from '../hooks/useAuditoria';
import { usePermission } from '../../shared/rbac/usePermission';
import { AuditoriaFiltros } from '../components/AuditoriaFiltros';
import { AuditoriaTable } from '../components/AuditoriaTable';
import { VerificarIntegridadModal } from '../components/VerificarIntegridadModal';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { hoyLocal } from '../../shared/lib/fecha';
import type { AuditoriaItemResponse } from '../types';

const DOCE_MESES_MS = 365 * 24 * 60 * 60 * 1000;

interface ExportacionAviso {
  variant: 'success' | 'warning';
  title: string;
  description: string;
}

export function AuditoriaPage() {
  const { t } = useT('auditoria');
  const puedeVer = usePermission(6, 2);
  const {
    eventos,
    total,
    loading,
    error,
    filtros,
    cargar,
    actualizarFiltros,
    resetFiltros,
    exportarTodos,
    exportando,
    exportProgreso,
    exportError,
    tiposEvento,
  } = useAuditoria();
  const [eventoVerificar, setEventoVerificar] = useState<AuditoriaItemResponse | null>(null);
  const [archivoMsg, setArchivoMsg] = useState<string | null>(null);
  const [exportacionAviso, setExportacionAviso] = useState<ExportacionAviso | null>(null);

  useEffect(() => {
    if (puedeVer) cargar();
  }, [puedeVer, cargar]);

  if (!puedeVer) {
    return (
      <div style={{ padding: 'var(--s7)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('auditoriapage.no_tienes_permiso_para_ver_esta_seccion')}</p>
      </div>
    );
  }

  const handleExportarCsv = async () => {
    setExportacionAviso(null);
    const resultado = await exportarTodos();
    if (!resultado) return;

    // El CSV llega ya armado por el backend, con las etiquetas de su catálogo.
    const blob = new Blob([resultado.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `auditoria-${hoyLocal()}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);

    const exportados = formatearFechaHora(resultado.exportados);
    const disponibles = formatearFechaHora(resultado.total);
    if (resultado.truncado) {
      setExportacionAviso({
        variant: 'warning',
        title: t('auditoriapage.exportacion_parcial'),
        description: t('auditoriapage.exportacion_parcial_detalle', { exportados, disponibles }),
      });
    } else {
      setExportacionAviso({
        variant: 'success',
        title: t('auditoriapage.csv_generado'),
        description: t('auditoriapage.exportacion_completa_detalle', { count: resultado.exportados }),
      });
    }
  };

  const handleSimularArchivado = () => {
    const ahora = Date.now();
    const count = eventos.filter((e) => ahora - new Date(e.fecha_evento).getTime() > DOCE_MESES_MS).length;
    setArchivoMsg(
      count > 0
        ? t('auditoriapage.archivado_conteo', { count })
        : t('auditoriapage.archivado_ninguno')
    );
  };

  const totalPages = Math.ceil(total / filtros.tamano);

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('auditoriapage.auditoria')}</h1>
          <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
            {loading ? t('estados.cargando', { ns: 'common' }) : t('auditoriapage.eventos_encontrados', { count: total })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleSimularArchivado} disabled={eventos.length === 0}>
            <Archive size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriapage.simular_archivado')}</Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportarCsv}
            loading={exportando}
            disabled={loading || exportando || total === 0}
          >
            <Download size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriapage.exportar_csv')}</Button>
          <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('auditoriapage.recargar')}>
            <RefreshCw size={16} aria-hidden />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title={t('auditoriapage.error_al_cargar_auditoria')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {exportError && (
        <Alert
          variant="error"
          title={t('auditoriapage.error_al_exportar_csv')}
          description={exportError.message}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {exportProgreso && (
        <Alert
          variant="info"
          title={t('auditoriapage.exportacion_en_curso')}
          description={exportProgreso}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {exportacionAviso && (
        <Alert
          key={`${exportacionAviso.variant}-${exportacionAviso.description}`}
          variant={exportacionAviso.variant}
          title={exportacionAviso.title}
          description={exportacionAviso.description}
          onDismiss={() => setExportacionAviso(null)}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {archivoMsg && (
        <Alert
          variant="info"
          title={t('auditoriapage.simulacion_de_archivado')}
          description={archivoMsg}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      <AuditoriaFiltros onBuscar={actualizarFiltros} onReset={resetFiltros} tiposEvento={tiposEvento} />

      <AuditoriaTable eventos={eventos} loading={loading} onVerificar={setEventoVerificar} tiposEvento={tiposEvento} />

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina <= 1}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina - 1 })}
          >{t('auditoriapage.anterior')}</Button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--fs-label-md)', color: 'var(--text-secondary)' }}>
            {t('auditoriapage.pagina_x_de_y', { pagina: filtros.pagina, total: totalPages })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina >= totalPages}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina + 1 })}
          >{t('auditoriapage.siguiente')}</Button>
        </div>
      )}

      {/* Modal de verificación de integridad */}
      {eventoVerificar && (
        <VerificarIntegridadModal
          evento={eventoVerificar}
          tiposEvento={tiposEvento}
          onClose={() => setEventoVerificar(null)}
        />
      )}
    </div>
  );
}
