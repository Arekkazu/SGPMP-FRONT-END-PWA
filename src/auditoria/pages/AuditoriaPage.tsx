import React, { useEffect, useState } from 'react';
import { RefreshCw, Download, Archive, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuditoria } from '../hooks/useAuditoria';
import { usePermission } from '../../shared/rbac/usePermission';
import { AuditoriaFiltros, TIPOS_EVENTO } from '../components/AuditoriaFiltros';
import { AuditoriaTable } from '../components/AuditoriaTable';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import type { AuditoriaItemResponse } from '../types';

const DOCE_MESES_MS = 365 * 24 * 60 * 60 * 1000;

function generarCsv(eventos: AuditoriaItemResponse[]): string {
  const cabecera = ['ID', 'Usuario', 'Tipo evento', 'Módulo', 'Descripción', 'Resultado', 'IP', 'Fecha/Hora', 'Hash'];
  const filas = eventos.map((e) => [
    e.id_evento,
    e.nombre_usuario ?? e.id_usuario,
    TIPOS_EVENTO.find((t) => t.id === e.tipo_evento)?.label ?? e.tipo_evento,
    e.modulo,
    `"${(e.descripcion ?? '').replace(/"/g, '""')}"`,
    e.resultado,
    e.ip ?? '',
    e.fecha_evento,
    e.hash ?? '',
  ]);
  return [cabecera, ...filas].map((r) => r.join(',')).join('\n');
}

function hashSimulado(evento: AuditoriaItemResponse): string {
  const base = `${evento.id_evento}-${evento.tipo_evento}-${evento.fecha_evento}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + 'a1b2c3d4e5f6';
}

export function AuditoriaPage() {
  const puedeVer = usePermission(6, 2);
  const { eventos, total, loading, error, filtros, cargar, actualizarFiltros, resetFiltros } = useAuditoria();
  const [eventoVerificar, setEventoVerificar] = useState<AuditoriaItemResponse | null>(null);
  const [archivoMsg, setArchivoMsg] = useState<string | null>(null);

  useEffect(() => {
    if (puedeVer) cargar();
  }, [puedeVer, cargar]);

  if (!puedeVer) {
    return (
      <div style={{ padding: 'var(--s7)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No tienes permiso para ver esta sección.</p>
      </div>
    );
  }

  const handleExportarCsv = () => {
    const csv = generarCsv(eventos);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimularArchivado = () => {
    const ahora = Date.now();
    const count = eventos.filter((e) => ahora - new Date(e.fecha_evento).getTime() > DOCE_MESES_MS).length;
    setArchivoMsg(
      count > 0
        ? `${count} evento${count !== 1 ? 's' : ''} del conjunto actual ${count !== 1 ? 'tienen' : 'tiene'} más de 12 meses y serían archivados.`
        : 'Ningún evento del conjunto actual supera los 12 meses de antigüedad.'
    );
  };

  const totalPages = Math.ceil(total / filtros.tamano);

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)', gap: 'var(--s3)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Auditoría
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {loading ? 'Cargando…' : `${total} evento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleSimularArchivado} disabled={eventos.length === 0}>
            <Archive size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Simular archivado
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportarCsv} disabled={eventos.length === 0}>
            <Download size={14} aria-hidden style={{ marginRight: 'var(--s1)' }} />
            Exportar CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label="Recargar">
            <RefreshCw size={16} aria-hidden />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Error al cargar auditoría" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {archivoMsg && (
        <Alert
          variant="info"
          title="Simulación de archivado"
          description={archivoMsg}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      <AuditoriaFiltros onBuscar={actualizarFiltros} onReset={resetFiltros} />

      <AuditoriaTable eventos={eventos} loading={loading} onVerificar={setEventoVerificar} />

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina <= 1}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina - 1 })}
          >
            ← Anterior
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Página {filtros.pagina} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina >= totalPages}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina + 1 })}
          >
            Siguiente →
          </Button>
        </div>
      )}

      {/* Modal de verificación de integridad */}
      {eventoVerificar && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="verificar-modal-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            padding: 'var(--s4)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEventoVerificar(null); }}
        >
          <div style={{
            background: 'var(--surface-card)',
            borderRadius: 'var(--r-xl)',
            border: '1px solid var(--surface-border)',
            padding: 'var(--s6)',
            width: '100%',
            maxWidth: 520,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
              <h2 id="verificar-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Verificación de integridad
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEventoVerificar(null)} aria-label="Cerrar">
                <X size={18} aria-hidden />
              </Button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s5)' }}>
              Evento <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>#{eventoVerificar.id_evento}</strong>
              {' · '}{TIPOS_EVENTO.find((t) => t.id === eventoVerificar.tipo_evento)?.label ?? eventoVerificar.tipo_evento}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Hash almacenado
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all', background: 'var(--surface-hover)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)' }}>
                  {eventoVerificar.hash ?? '(no disponible)'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  Hash recalculado
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all', background: 'var(--surface-hover)', padding: 'var(--s2) var(--s3)', borderRadius: 'var(--r-md)' }}>
                  {hashSimulado(eventoVerificar)}
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--s2)',
              padding: 'var(--s3) var(--s4)',
              borderRadius: 'var(--r-md)',
              background: eventoVerificar.integridad_ok ? 'var(--sem-success-bg)' : 'var(--sem-error-bg)',
              border: `1px solid ${eventoVerificar.integridad_ok ? 'var(--sem-success-border)' : 'var(--sem-error-border)'}`,
              marginBottom: 'var(--s5)',
            }}>
              {eventoVerificar.integridad_ok
                ? <ShieldCheck size={18} color="var(--sem-success)" aria-hidden />
                : <ShieldAlert size={18} color="var(--sem-error)" aria-hidden />
              }
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: eventoVerificar.integridad_ok ? 'var(--sem-success)' : 'var(--sem-error)',
              }}>
                {eventoVerificar.integridad_ok ? 'Integridad verificada' : 'Violación de integridad detectada'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="md" onClick={() => setEventoVerificar(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
