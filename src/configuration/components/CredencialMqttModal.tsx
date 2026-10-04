import { useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw, X } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useModalA11y } from '../../shared/hooks/useModalA11y';
import { useCredencialMqtt } from '../hooks/useCredencialMqtt';
import type { CredencialMqttResponse, DispositivoIotResponse } from '../types';

/** Bloque listo para pegar en /etc/sgpmp/edge-agent.env del Gateway Edge. */
function archivoEdgeAgent(c: CredencialMqttResponse): string {
  return [
    `EDGE_MQTT_USERNAME=${c.usuario}`,
    `EDGE_MQTT_PASSWORD=${c.password}`,
    `EDGE_SERIALS=${c.seriales.join(',')}`,
  ].join('\n');
}

function CredencialGenerada({ credencial, onListo }: { credencial: CredencialMqttResponse; onListo: () => void }) {
  const { t } = useT('configuration');
  const [copiado, setCopiado] = useState(false);
  const texto = archivoEdgeAgent(credencial);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false); // sin permiso de portapapeles: queda el texto seleccionable
    }
  };

  return (
    <div role="region" aria-label={t('credencialmqttmodal.credencial_generada')} style={{ marginTop: 'var(--s5)' }}>
      <Alert variant="warning" title={t('credencialmqttmodal.credencial_generada')} description={t('credencialmqttmodal.solo_una_vez')} />
      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', padding: 'var(--s4)', margin: 'var(--s4) 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'all' }}>
        {texto}
      </pre>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
        <Button variant="secondary" size="md" onClick={copiar}>
          <Copy size={14} aria-hidden style={{ marginRight: 'var(--s2)' }} />
          {copiado ? t('credencialmqttmodal.copiado') : t('credencialmqttmodal.copiar')}
        </Button>
        <Button variant="primary" size="md" onClick={onListo}>{t('credencialmqttmodal.listo')}</Button>
      </div>
    </div>
  );
}

/**
 * RF-23 / TC-M09-250/251 — credencial MQTT de un Gateway Edge. Cubre el serial
 * del Edge y el de cada dispositivo activo que lo apunta (RF-21).
 */
export function CredencialMqttModal({ dispositivo, onClose }: { dispositivo: DispositivoIotResponse; onClose: () => void }) {
  const dialogRef = useModalA11y(onClose);
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeEmitir = usePermission(11, 3);
  const puedeRevocar = usePermission(11, 4);
  const { estado, credencial, loading, saving, error, saveError, cargar, emitir, revocar, descartarCredencial } = useCredencialMqtt();
  const [confirmando, setConfirmando] = useState<'rotar' | 'revocar' | null>(null);
  const id = dispositivo.id_dispositivo_iot;

  useEffect(() => { cargar(id); }, [cargar, id]);

  const ejecutar = async (accion: 'emitir' | 'revocar') => {
    setConfirmando(null);
    if (accion === 'emitir') await emitir(id);
    else await revocar(id);
  };

  const activa = estado?.emitida && estado.habilitada;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credencial-mqtt-titulo"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 'var(--s6) var(--s4)', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', padding: 'var(--s6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <KeyRound size={18} color="var(--brand-500)" aria-hidden />
            <div>
              <h2 id="credencial-mqtt-titulo" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('credencialmqttmodal.titulo')}</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{dispositivo.serial}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('credencialmqttmodal.cerrar')}>
            <X size={18} aria-hidden />
          </Button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 0 }}>{t('credencialmqttmodal.subtitulo')}</p>

        {!online && <Alert variant="warning" title={t('credencialmqttmodal.sin_conexion')} description={t('credencialmqttmodal.requiere_conexion')} style={{ marginBottom: 'var(--s4)' }} />}
        {error && <Alert variant="error" title={t('credencialmqttmodal.error_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
        {saveError && <Alert variant="error" title={t('credencialmqttmodal.error_operacion')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />}

        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('credencialmqttmodal.cargando')}</p>
        ) : estado && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
            {!estado.emitida && <Badge variant="neutral">{t('credencialmqttmodal.estado_sin_credencial')}</Badge>}
            {activa && <Badge variant="success" dot>{t('credencialmqttmodal.estado_habilitada')}</Badge>}
            {estado.emitida && !estado.habilitada && <Badge variant="error">{t('credencialmqttmodal.estado_revocada')}</Badge>}
            {activa && (
              <Badge variant={estado.conectada ? 'info' : 'neutral'}>
                {estado.conectada ? t('credencialmqttmodal.conectado') : t('credencialmqttmodal.desconectado')}
              </Badge>
            )}
            {estado.emitida && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('credencialmqttmodal.seriales_cubiertos')}: {estado.seriales.join(', ')}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => cargar(id)} aria-label={t('credencialmqttmodal.recargar')}>
              <RefreshCw size={14} aria-hidden />
            </Button>
          </div>
        )}

        {confirmando && (
          <div role="alertdialog" aria-labelledby="credencial-mqtt-confirmacion" style={{ border: '1px solid var(--sem-error-border)', background: 'var(--sem-error-bg)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
            <p id="credencial-mqtt-confirmacion" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: 0 }}>
              {confirmando === 'rotar' ? t('credencialmqttmodal.confirmar_rotar') : t('credencialmqttmodal.confirmar_revocar')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmando(null)}>{t('credencialmqttmodal.cancelar')}</Button>
              <Button variant="danger" size="sm" loading={saving} onClick={() => ejecutar(confirmando === 'rotar' ? 'emitir' : 'revocar')}>
                {confirmando === 'rotar' ? t('credencialmqttmodal.rotar') : t('credencialmqttmodal.revocar')}
              </Button>
            </div>
          </div>
        )}

        {!confirmando && estado && !credencial && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', flexWrap: 'wrap' }}>
            {puedeRevocar && activa && (
              <Button variant="danger" size="md" disabled={!online || saving} onClick={() => setConfirmando('revocar')}>
                {t('credencialmqttmodal.revocar')}
              </Button>
            )}
            {puedeEmitir && (
              <Button
                variant="primary"
                size="md"
                loading={saving}
                disabled={!online}
                onClick={() => (activa ? setConfirmando('rotar') : ejecutar('emitir'))}
              >
                {activa ? t('credencialmqttmodal.rotar') : t('credencialmqttmodal.generar')}
              </Button>
            )}
          </div>
        )}

        {credencial && <CredencialGenerada credencial={credencial} onListo={descartarCredencial} />}
      </div>
    </div>
  );
}
