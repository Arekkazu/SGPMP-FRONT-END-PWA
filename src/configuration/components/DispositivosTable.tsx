import React, { useEffect, useState } from 'react';
import { formatearFecha, formatearNumero } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { Cpu, RefreshCw, Plus, PowerOff, ChevronLeft, Warehouse, Radio, KeyRound, Network } from 'lucide-react';
import { Button } from '../../shared/design-system/Button';
import { Alert } from '../../shared/design-system/Alert';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useFincas } from '../hooks/useFincas';
import { useInfraestructuras } from '../hooks/useInfraestructuras';
import { useDispositivosIot } from '../hooks/useDispositivosIot';
import { useSensores } from '../hooks/useSensores';
import { DispositivoModal } from './DispositivoModal';
import { SensorModal } from './SensorModal';
import { CredencialMqttModal } from './CredencialMqttModal';
import { CambiarGatewayModal } from './CambiarGatewayModal';
import type { FincaResponse, InfraestructuraResponse, DispositivoIotResponse } from '../types';
import { useModalA11y } from '../../shared/hooks/useModalA11y';

// ── Styles ───────────────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: 'var(--s2) var(--s4)',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
};

const TD: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  borderBottom: '1px solid var(--surface-border)',
};

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return formatearFecha(iso, { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return iso;
  }
}

function ConfirmModal({ titulo, mensaje, saving, onCancel, onConfirm }: {
  titulo: string; mensaje: string; saving: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const dialogRef = useModalA11y(onCancel);
  const { t } = useT('configuration');
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: 'var(--s4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', border: '1px solid var(--surface-border)', padding: 'var(--s6)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{titulo}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--s6)', lineHeight: 1.5 }}>{mensaje}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--s3)' }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>{t('dispositivostable.cancelar')}</Button>
          <Button variant="danger" size="md" loading={saving} onClick={onConfirm}>{t('dispositivostable.desactivar')}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Finca selector ────────────────────────────────────────────────────────────

function FincaSelector({ fincas, loading, onSelect }: { fincas: FincaResponse[]; loading: boolean; onSelect: (f: FincaResponse) => void }) {
  const { t } = useT('configuration');
  const activas = fincas.filter((f) => f.es_activo);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 82, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
      </div>
    );
  }
  if (activas.length === 0) {
    return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s7) 0', fontSize: '14px' }}>{t('dispositivostable.no_hay_fincas_activas_registra_una_finca')}</p>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s4)' }}>
      {activas.map((f) => (
        <OptionCard key={f.id_finca} onClick={() => onSelect(f)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
            <Warehouse size={15} color="var(--brand-500)" aria-hidden />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.nombre}</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{f.ubicacion.departamento}, {f.ubicacion.municipio}</div>
        </OptionCard>
      ))}
    </div>
  );
}

// ── Area selector ─────────────────────────────────────────────────────────────

function AreaSelector({ infras, loading, onSelect, onBack }: {
  infras: InfraestructuraResponse[]; loading: boolean;
  onSelect: (i: InfraestructuraResponse) => void; onBack: () => void;
}) {
  const { t } = useT('configuration');
  const activas = infras.filter((i) => i.es_activo);

  return (
    <div>
      <div style={{ marginBottom: 'var(--s4)' }}>
        <Button variant="ghost" size="sm" onClick={onBack} aria-label={t('dispositivostable.volver_a_fincas')}>
          <ChevronLeft size={16} aria-hidden />{t('dispositivostable.cambiar_finca')}</Button>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('dispositivostable.selecciona_el_area_productiva_donde_esta')}</p>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--s3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      ) : activas.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--s6) 0', fontSize: '14px' }}>{t('dispositivostable.esta_finca_no_tiene_areas_productivas')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--s3)' }}>
          {activas.map((infra) => (
            <OptionCard key={infra.id_infraestructura} onClick={() => onSelect(infra)}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{infra.nombre_infraestructura}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {infra.tipo_area} · {formatearNumero(infra.superficie)} m²
              </div>
            </OptionCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DispositivosTable ─────────────────────────────────────────────────────────

type Step = 'finca' | 'area' | 'dispositivos';
type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'crear' }
  | { tipo: 'desactivar'; id: number; serial: string }
  | { tipo: 'sensor'; dispositivo: DispositivoIotResponse }
  | { tipo: 'credencial'; dispositivo: DispositivoIotResponse }
  | { tipo: 'gateway'; dispositivo: DispositivoIotResponse };

export function DispositivosTable() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedeCrear  = usePermission(11, 1);
  const puedeLeer   = usePermission(11, 2);
  const puedeEditar = usePermission(11, 3);
  const puedeDesact = usePermission(11, 4);

  const { fincas, loading: loadingFincas, cargar: cargarFincas } = useFincas();
  const { infraestructuras, loading: loadingInfras, cargar: cargarInfras } = useInfraestructuras();
  const {
    dispositivos, loading, saving, error, saveError, cargar, registrar, desactivar, asignarGateway, esGatewayEdge,
  } = useDispositivosIot();
  const { saving: savingSensor, saveError: saveErrorSensor, registrar: registrarSensor } = useSensores();

  const [step, setStep] = useState<Step>('finca');
  const [finca, setFinca] = useState<FincaResponse | null>(null);
  const [area, setArea] = useState<InfraestructuraResponse | null>(null);
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [accionError, setAccionError] = useState<string | null>(null);

  useEffect(() => { cargarFincas(); }, [cargarFincas]);

  const handleSelectFinca = (f: FincaResponse) => {
    setFinca(f);
    setStep('area');
    cargarInfras(f.id_finca);
  };

  const handleSelectArea = (i: InfraestructuraResponse) => {
    setArea(i);
    setStep('dispositivos');
    cargar();
  };

  const handleBackToFinca = () => {
    setFinca(null);
    setArea(null);
    setStep('finca');
  };

  const handleBackToArea = () => {
    setArea(null);
    setStep('area');
  };

  const cerrar = () => setModal({ tipo: 'ninguno' });

  const handleDesactivar = async (id: number) => {
    setAccionError(null);
    const ok = await desactivar(id);
    if (!ok) setAccionError(saveError?.message ?? 'Error al desactivar.');
    else cerrar();
  };

  const dispositivosDelArea = area
    ? dispositivos.filter((d) => d.id_infraestructura === area.id_infraestructura)
    : [];

  const activos   = dispositivosDelArea.filter((d) => d.es_activo).length;
  const inactivos = dispositivosDelArea.length - activos;

  // RF-21: Gateway Edge de la finca (un Edge atiende dispositivos de cualquier
  // área de su finca) y dispositivos activos que atiende cada uno.
  const areasDeLaFinca = new Set(infraestructuras.map((i) => i.id_infraestructura));
  const edgesDeLaFinca = dispositivos.filter(
    (d) => esGatewayEdge(d) && d.es_activo && areasDeLaFinca.has(d.id_infraestructura),
  );
  const porId = new Map(dispositivos.map((d) => [d.id_dispositivo_iot, d]));
  const atendidosPor = (idEdge: number) =>
    dispositivos.filter((d) => d.id_dispositivo_gateway === idEdge && d.es_activo);

  const mensajeDesactivar = (id: number, serial: string) => {
    const atendidos = atendidosPor(id);
    const base = `¿Desactivar el dispositivo "${serial}"? Los datos históricos de sus sensores seguirán accesibles.`;
    if (atendidos.length === 0) return base;
    return `${base} ${t('dispositivostable.cascada_edge', { seriales: atendidos.map((d) => d.serial).join(', ') })}`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        <Cpu size={18} color="var(--brand-500)" aria-hidden />
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dispositivostable.dispositivos_iot')}</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{t('dispositivostable.los_dispositivos_se_asocian_a_un_area')}</p>
        </div>
      </div>

      {/* Step 1: Finca */}
      {step === 'finca' && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('dispositivostable.paso_1_selecciona_la_finca')}</p>
          <FincaSelector fincas={fincas} loading={loadingFincas} onSelect={handleSelectFinca} />
        </>
      )}

      {/* Step 2: Area */}
      {step === 'area' && finca && (
        <>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>{t('dispositivostable.paso_2_selecciona_el_area_de')}{' '}<strong>{finca.nombre}</strong>:
          </p>
          <AreaSelector
            infras={infraestructuras}
            loading={loadingInfras}
            onSelect={handleSelectArea}
            onBack={handleBackToFinca}
          />
        </>
      )}

      {/* Step 3: Dispositivos */}
      {step === 'dispositivos' && finca && area && (
        <>
          {/* Breadcrumb / context */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s5)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              <Button variant="ghost" size="sm" onClick={handleBackToFinca} aria-label={t('dispositivostable.cambiar_finca')}>
                <ChevronLeft size={16} aria-hidden />{t('dispositivostable.fincas')}</Button>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>
              <button
                type="button"
                onClick={handleBackToArea}
                style={{ background: 'none', border: 'none', padding: 'var(--s1) var(--s2)', cursor: 'pointer', fontSize: '13px', color: 'var(--brand-600)', fontWeight: 600 }}
              >
                {finca.nombre}
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{area.nombre_infraestructura}</span>
              {!loading && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activos} activos · {inactivos} inactivos
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--s2)' }}>
              <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('dispositivostable.recargar_dispositivos')}>
                <RefreshCw size={15} aria-hidden />
              </Button>
              {puedeCrear && (
                <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} disabled={!online}>
                  <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('dispositivostable.nuevo_dispositivo')}</Button>
              )}
            </div>
          </div>

          {/* Alerts */}
          {!online && <Alert variant="warning" title={t('dispositivostable.sin_conexion')} description={t('dispositivostable.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s4)' }} />}
          {error && <Alert variant="error" title={t('dispositivostable.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />}
          {accionError && <Alert variant="error" title={t('dispositivostable.error')} description={accionError} style={{ marginBottom: 'var(--s4)' }} />}

          {/* Table */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 52, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
              ))}
              <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
            </div>
          ) : dispositivosDelArea.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--s7) 0', color: 'var(--text-muted)' }}>
              <Cpu size={32} color="var(--text-muted)" style={{ marginBottom: 'var(--s3)' }} aria-hidden />
              <p style={{ fontSize: '14px' }}>{t('dispositivostable.no_hay_dispositivos_en_esta_area')}</p>
              {puedeCrear && online && (
                <Button variant="primary" size="sm" onClick={() => setModal({ tipo: 'crear' })} style={{ marginTop: 'var(--s3)' }}>
                  <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('dispositivostable.registrar_primer_dispositivo')}</Button>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
                      {['ID', 'Serial físico', 'Descripción', t('dispositivostable.gateway_edge'), 'Área → Finca', 'Estado', 'Registro', 'Acciones'].map((h) => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dispositivosDelArea.map((d) => (
                      <tr key={d.id_dispositivo_iot} style={{ background: 'var(--surface-card)' }}>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                          #{d.id_dispositivo_iot}
                        </td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--brand-600)', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                          {d.serial}
                        </td>
                        <td style={{ ...TD, maxWidth: 240 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                            {d.descripcion}
                          </div>
                        </td>
                        <td style={{ ...TD, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {esGatewayEdge(d) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)', fontWeight: 700, color: 'var(--brand-600)' }}>
                              <Network size={13} aria-hidden />
                              {t('dispositivostable.es_gateway_edge', { n: atendidosPor(d.id_dispositivo_iot).length })}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-mono)', color: d.id_dispositivo_gateway ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {d.id_dispositivo_gateway ? porId.get(d.id_dispositivo_gateway)?.serial ?? `#${d.id_dispositivo_gateway}` : '—'}
                            </span>
                          )}
                        </td>
                        <td style={TD}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{area.nombre_infraestructura}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{finca.nombre}</div>
                        </td>
                        <td style={TD}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 'var(--s1)',
                            padding: '2px var(--s2)', borderRadius: 'var(--r-full)',
                            fontSize: '11px', fontWeight: 600,
                            background: d.es_activo ? 'var(--sem-success-bg)' : 'var(--surface-hover)',
                            color: d.es_activo ? 'var(--sem-success)' : 'var(--text-muted)',
                            border: `1px solid ${d.es_activo ? 'var(--sem-success-border)' : 'var(--surface-border)'}`,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.es_activo ? 'var(--sem-success)' : 'var(--text-muted)' }} />
                            {d.es_activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ ...TD, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatFecha(d.fecha_creacion)}
                        </td>
                        <td style={{ ...TD, display: 'flex', gap: 'var(--s1)' }}>
                          {esGatewayEdge(d) && puedeLeer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModal({ tipo: 'credencial', dispositivo: d })}
                              aria-label={`${t('dispositivostable.credencial_mqtt')} ${d.serial}`}
                            >
                              <KeyRound size={15} aria-hidden style={{ color: 'var(--brand-500)' }} />
                            </Button>
                          )}
                          {!esGatewayEdge(d) && puedeEditar && d.es_activo && online && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModal({ tipo: 'gateway', dispositivo: d })}
                              aria-label={`${t('dispositivostable.cambiar_gateway_edge')} ${d.serial}`}
                            >
                              <Network size={15} aria-hidden style={{ color: 'var(--brand-500)' }} />
                            </Button>
                          )}
                          {!esGatewayEdge(d) && puedeCrear && d.es_activo && online && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModal({ tipo: 'sensor', dispositivo: d })}
                              aria-label={`${t('dispositivostable.registrar_sensor')} ${d.serial}`}
                            >
                              <Radio size={15} aria-hidden style={{ color: 'var(--brand-500)' }} />
                            </Button>
                          )}
                          {puedeDesact && d.es_activo && online && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setModal({ tipo: 'desactivar', id: d.id_dispositivo_iot, serial: d.serial })}
                              aria-label={`Desactivar ${d.serial}`}
                            >
                              <PowerOff size={15} aria-hidden style={{ color: 'var(--sem-error)' }} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modals */}
          {modal.tipo === 'crear' && (
            <DispositivoModal
              area={area}
              edges={edgesDeLaFinca}
              saving={saving}
              saveError={saveError}
              onClose={cerrar}
              onRegistrar={registrar}
            />
          )}
          {modal.tipo === 'desactivar' && (
            <ConfirmModal
              titulo="Desactivar dispositivo"
              mensaje={mensajeDesactivar(modal.id, modal.serial)}
              saving={saving}
              onCancel={cerrar}
              onConfirm={() => handleDesactivar(modal.id)}
            />
          )}
          {modal.tipo === 'credencial' && (
            <CredencialMqttModal dispositivo={modal.dispositivo} onClose={cerrar} />
          )}
          {modal.tipo === 'gateway' && (
            <CambiarGatewayModal
              dispositivo={modal.dispositivo}
              edges={edgesDeLaFinca}
              saving={saving}
              saveError={saveError}
              onClose={cerrar}
              onAsignar={(idGateway) => asignarGateway(modal.dispositivo.id_dispositivo_iot, idGateway)}
            />
          )}
          {modal.tipo === 'sensor' && (
            <SensorModal
              dispositivo={modal.dispositivo}
              saving={savingSensor}
              saveError={saveErrorSensor}
              onClose={cerrar}
              onRegistrar={registrarSensor}
            />
          )}
        </>
      )}
    </div>
  );
}
