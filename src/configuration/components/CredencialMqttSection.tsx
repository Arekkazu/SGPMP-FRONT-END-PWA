import { useEffect, useState } from 'react';
import { Copy, KeyRound, RefreshCw } from 'lucide-react';
import { useT } from '../../shared/i18n/useT';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';
import { Button } from '../../shared/design-system/Button';
import { Select } from '../../shared/design-system/Select';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useCredencialMqtt } from '../hooks/useCredencialMqtt';
import type { CredencialMqttResponse } from '../types';

/** Bloque listo para pegar en /etc/sgpmp/edge-agent.env de la Raspberry. */
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
    <div role="region" aria-label={t('credencialmqttsection.credencial_generada')} style={{ border: '1.5px solid var(--sem-warning-border, #fde68a)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', marginTop: 'var(--s5)' }}>
      <Alert variant="warning" title={t('credencialmqttsection.credencial_generada')} description={t('credencialmqttsection.solo_una_vez')} />
      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)', padding: 'var(--s4)', margin: 'var(--s4) 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'all' }}>
        {texto}
      </pre>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
        <Button variant="secondary" size="md" onClick={copiar}>
          <Copy size={14} aria-hidden style={{ marginRight: 'var(--s2)' }} />
          {copiado ? t('credencialmqttsection.copiado') : t('credencialmqttsection.copiar')}
        </Button>
        <Button variant="primary" size="md" onClick={onListo}>{t('credencialmqttsection.listo')}</Button>
      </div>
    </div>
  );
}

export function CredencialMqttSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeVer = usePermission(11, 2);
  const puedeEmitir = usePermission(11, 3);
  const puedeRevocar = usePermission(11, 4);

  const { dispositivos, cargar: cargarDispositivos } = useDispositivosIot();
  const { estado, credencial, loading, saving, error, saveError, cargar, emitir, revocar, descartarCredencial } = useCredencialMqtt();

  const [idDispositivo, setIdDispositivo] = useState<number | null>(null);
  const [adicionales, setAdicionales] = useState<number[]>([]);
  const [confirmando, setConfirmando] = useState<'rotar' | 'revocar' | null>(null);

  useEffect(() => { cargarDispositivos(); }, [cargarDispositivos]);

  const activos = dispositivos.filter((d) => d.es_activo);
  const otros = activos.filter((d) => d.id_dispositivo_iot !== idDispositivo);

  const seleccionar = (valor: string) => {
    const id = valor ? Number(valor) : null;
    setIdDispositivo(id);
    setAdicionales([]);
    setConfirmando(null);
    if (id !== null) cargar(id);
  };

  const alternarAdicional = (id: number) =>
    setAdicionales((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ejecutar = async (accion: 'emitir' | 'revocar') => {
    if (idDispositivo === null) return;
    setConfirmando(null);
    if (accion === 'emitir') await emitir(idDispositivo, adicionales);
    else await revocar(idDispositivo);
  };

  if (!puedeVer) return null;

  const tieneCredencialActiva = estado?.emitida && estado.habilitada;

  return (
    <div style={{ marginTop: 'var(--s7)', borderTop: '2px solid var(--surface-border)', paddingTop: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <KeyRound size={18} color="var(--brand-500)" aria-hidden />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('credencialmqttsection.titulo')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('credencialmqttsection.subtitulo')}</p>
        </div>
      </div>

      {!online && <Alert variant="warning" title={t('credencialmqttsection.sin_conexion')} description={t('credencialmqttsection.requiere_conexion')} style={{ marginBottom: 'var(--s4)' }} />}

      <Select
        id="credencial-mqtt-dispositivo"
        label={t('credencialmqttsection.dispositivo')}
        value={idDispositivo ?? ''}
        onChange={(e) => seleccionar(e.target.value)}
        disabled={saving}
      >
        <option value="">{t('credencialmqttsection.seleccionar')}</option>
        {activos.map((d) => (
          <option key={d.id_dispositivo_iot} value={d.id_dispositivo_iot}>{d.serial} — {d.descripcion}</option>
        ))}
      </Select>

      {idDispositivo !== null && (
        <div style={{ marginTop: 'var(--s5)' }}>
          {error && <Alert variant="error" title={t('credencialmqttsection.error_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
          {saveError && <Alert variant="error" title={t('credencialmqttsection.error_operacion')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />}

          {loading ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('credencialmqttsection.cargando')}</p>
          ) : estado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
              {!estado.emitida && <Badge variant="neutral">{t('credencialmqttsection.estado_sin_credencial')}</Badge>}
              {estado.emitida && estado.habilitada && <Badge variant="success" dot>{t('credencialmqttsection.estado_habilitada')}</Badge>}
              {estado.emitida && !estado.habilitada && <Badge variant="error">{t('credencialmqttsection.estado_revocada')}</Badge>}
              {tieneCredencialActiva && (
                <Badge variant={estado.conectada ? 'info' : 'neutral'}>
                  {estado.conectada ? t('credencialmqttsection.conectada') : t('credencialmqttsection.desconectada')}
                </Badge>
              )}
              {estado.emitida && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {t('credencialmqttsection.seriales_cubiertos')}: {estado.seriales.join(', ')}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={() => cargar(idDispositivo)} aria-label={t('credencialmqttsection.recargar')}>
                <RefreshCw size={14} aria-hidden />
              </Button>
            </div>
          )}
          {estado && !estado.emitida && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 0 }}>{t('credencialmqttsection.estado_sin_credencial_desc')}</p>
          )}

          {puedeEmitir && otros.length > 0 && (
            <fieldset style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', margin: 'var(--s4) 0' }}>
              <legend style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 var(--s2)' }}>{t('credencialmqttsection.adicionales')}</legend>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 0 }}>{t('credencialmqttsection.adicionales_ayuda')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 'var(--s2)' }}>
                {otros.map((d) => (
                  <label key={d.id_dispositivo_iot} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                    <input type="checkbox" checked={adicionales.includes(d.id_dispositivo_iot)} onChange={() => alternarAdicional(d.id_dispositivo_iot)} disabled={saving} />
                    {d.serial}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {confirmando && (
            <div role="alertdialog" aria-labelledby="credencial-mqtt-confirmacion" style={{ border: '1px solid var(--sem-error-border)', background: 'var(--sem-error-bg)', borderRadius: 'var(--r-lg)', padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
              <p id="credencial-mqtt-confirmacion" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: 0 }}>
                {confirmando === 'rotar' ? t('credencialmqttsection.confirmar_rotar') : t('credencialmqttsection.confirmar_revocar')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
                <Button variant="secondary" size="sm" onClick={() => setConfirmando(null)}>{t('credencialmqttsection.cancelar')}</Button>
                <Button variant="danger" size="sm" loading={saving} onClick={() => ejecutar(confirmando === 'rotar' ? 'emitir' : 'revocar')}>
                  {confirmando === 'rotar' ? t('credencialmqttsection.rotar') : t('credencialmqttsection.revocar')}
                </Button>
              </div>
            </div>
          )}

          {!confirmando && estado && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)', flexWrap: 'wrap' }}>
              {puedeRevocar && tieneCredencialActiva && (
                <Button variant="danger" size="md" disabled={!online || saving} onClick={() => setConfirmando('revocar')}>
                  {t('credencialmqttsection.revocar')}
                </Button>
              )}
              {puedeEmitir && (
                <Button
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={!online}
                  onClick={() => (tieneCredencialActiva ? setConfirmando('rotar') : ejecutar('emitir'))}
                >
                  {tieneCredencialActiva ? t('credencialmqttsection.rotar') : t('credencialmqttsection.generar')}
                </Button>
              )}
            </div>
          )}

          {credencial && <CredencialGenerada credencial={credencial} onListo={descartarCredencial} />}
        </div>
      )}
    </div>
  );
}
