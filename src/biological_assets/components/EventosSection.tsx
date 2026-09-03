import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import {
  TrendingUp, Stethoscope, Baby, Package, ArrowDownCircle, Info,
} from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useEventos } from '../hooks/useEventos';
import { EventoCrecimientoForm } from './EventoCrecimientoForm';
import { EventoSanitarioForm } from './EventoSanitarioForm';
import { EventoReproductivoForm } from './EventoReproductivoForm';
import { EventoProductivoForm } from './EventoProductivoForm';
import { RegistrarBajaModal } from './RegistrarBajaModal';
import { RECURSO_ACTIVOS, ACCION_C } from '../rbac';
import { ESTADOS_PERMITEN_EVENTOS } from '../types';
import type { EstadoActivoNombre, EventoActivoResponse } from '../types';

type ModalTipo = 'ninguno' | 'crecimiento' | 'sanitario' | 'reproductivo' | 'productivo' | 'baja';

interface Props {
  idActivo: number;
  tipo: string;
  estadoActual: string | null;
  onChanged: () => void;
}

const CARD: React.CSSProperties = {
  background: 'var(--surface-card)',
  border: '1px solid var(--surface-border)',
  borderRadius: 'var(--r-lg)',
  padding: 'var(--s5)',
};

function estadoPermiteEventos(estado: string | null): boolean {
  const up = (estado ?? '').toUpperCase().replace(/\s+/g, '_');
  return ESTADOS_PERMITEN_EVENTOS.includes(up as EstadoActivoNombre);
}

function resumenEvento(ev: EventoActivoResponse): { icon: React.ReactNode; tipo: string; detalle: string } {
  if (ev.crecimiento) {
    const c = ev.crecimiento;
    return { icon: <TrendingUp size={15} aria-hidden />, tipo: 'Crecimiento', detalle: `${c.tipo_medicion}: ${c.valor_medicion} ${c.unidad_medida}` };
  }
  if (ev.sanitario) {
    const s = ev.sanitario;
    return { icon: <Stethoscope size={15} aria-hidden />, tipo: 'Sanitario', detalle: `${s.tipo}${s.medicamento ? ` · ${s.medicamento}` : ''}` };
  }
  if (ev.reproductivo) {
    const r = ev.reproductivo;
    return { icon: <Baby size={15} aria-hidden />, tipo: 'Reproductivo', detalle: `${r.categoria} · ${r.resultado}` };
  }
  if (ev.productivo) {
    const p = ev.productivo;
    return { icon: <Package size={15} aria-hidden />, tipo: 'Productivo', detalle: `${p.tipo_producto ?? 'Producción'}: ${p.cantidad} ${p.unidad_medida ?? ''}` };
  }
  if (ev.baja) {
    const b = ev.baja;
    return { icon: <ArrowDownCircle size={15} aria-hidden />, tipo: 'Baja', detalle: `${b.tipo} · ${b.cantidad_afectada}` };
  }
  return { icon: <Info size={15} aria-hidden />, tipo: 'Evento', detalle: ev.descripcion ?? '—' };
}

export function EventosSection({ idActivo, tipo, estadoActual, onChanged }: Props) {
  const { t } = useT('biologicalAssets');
  const online = useOnlineStatus();
  const puedeCrear = usePermission(RECURSO_ACTIVOS, ACCION_C);
  const esPoblacional = String(tipo).toUpperCase() === 'POBLACIONAL';
  const permite = estadoPermiteEventos(estadoActual);

  const {
    eventos, loading, error, saving, saveError, cargar,
    registrarCrecimiento, registrarBaja, registrarSanitario, registrarProductivo, registrarReproductivo,
    setSaveError,
  } = useEventos(idActivo);

  const [modal, setModal] = useState<ModalTipo>('ninguno');
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (esPoblacional) cargar();
  }, [esPoblacional, cargar]);

  const refrescar = useCallback(async () => {
    if (esPoblacional) await cargar();
    onChanged();
  }, [esPoblacional, cargar, onChanged]);

  const abrir = (m: ModalTipo) => { setSaveError(null); setAviso(null); setModal(m); };
  const cerrar = () => setModal('ninguno');

  const botones: { id: ModalTipo; label: string; icon: React.ReactNode }[] = [
    { id: 'crecimiento', label: 'Crecimiento', icon: <TrendingUp size={15} aria-hidden /> },
    { id: 'sanitario', label: 'Sanitario', icon: <Stethoscope size={15} aria-hidden /> },
    { id: 'reproductivo', label: 'Reproductivo', icon: <Baby size={15} aria-hidden /> },
    { id: 'productivo', label: 'Productivo', icon: <Package size={15} aria-hidden /> },
    { id: 'baja', label: 'Baja', icon: <ArrowDownCircle size={15} aria-hidden /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Acciones de registro */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('eventossection.registrar_evento')}</h3>
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {puedeCrear && botones.map((b) => (
              <Button
                key={b.id}
                variant={b.id === 'baja' ? 'danger' : 'secondary'}
                size="sm"
                disabled={!online || !permite}
                onClick={() => abrir(b.id)}
              >
                <span style={{ marginRight: 'var(--s1)', display: 'inline-flex' }}>{b.icon}</span>
                {b.label}
              </Button>
            ))}
          </div>
        </div>
        {!permite && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 'var(--s3) 0 0' }}>
            El activo está en estado «{estadoActual}». Solo se pueden registrar eventos en ACTIVO, EN TRATAMIENTO o AISLADO.
          </p>
        )}
        {aviso && (
          <Alert variant="success" title={t('eventossection.evento_registrado')} description={aviso} style={{ marginTop: 'var(--s4)' }} />
        )}
      </div>

      {/* Historial de eventos (solo POBLACIONAL) */}
      <div style={CARD}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('eventossection.historial_de_eventos')}</h3>
        {!esPoblacional ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            El historial de eventos en lote solo aplica a activos poblacionales. Para activos individuales,
            consulta la pestaña «Historial» o la «Ficha integral».
          </p>
        ) : loading ? (
          <div style={{ height: 100, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : error && error.status !== 409 ? (
          <Alert variant="error" title={t('eventossection.error_al_cargar_eventos')} description={error.message} />
        ) : eventos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{t('eventossection.sin_eventos_registrados')}</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            {eventos.map((ev) => {
              const r = resumenEvento(ev);
              return (
                <li
                  key={ev.id_eventos}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', padding: 'var(--s3)', background: 'var(--surface-hover)', borderRadius: 'var(--r-md)' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.tipo}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.detalle}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {ev.fecha?.slice(0, 10)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modales */}
      {modal === 'crecimiento' && (
        <EventoCrecimientoForm
          esPoblacional={esPoblacional}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarCrecimiento(dto);
            if (res) { setAviso(res.fase_avanzada ? 'Registrado. Se avanzó de fase automáticamente.' : 'Evento de crecimiento registrado.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'sanitario' && (
        <EventoSanitarioForm
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarSanitario(dto);
            if (res) { setAviso(res.cambio_estado ? 'Registrado. Se aplicó un cambio de estado.' : 'Evento sanitario registrado.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'reproductivo' && (
        <EventoReproductivoForm
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarReproductivo(dto);
            if (res) { setAviso('Evento reproductivo registrado.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'productivo' && (
        <EventoProductivoForm
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarProductivo(dto);
            if (res) { setAviso('Evento productivo registrado.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'baja' && (
        <RegistrarBajaModal
          esPoblacional={esPoblacional}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarBaja(dto);
            if (res) { setAviso('Baja registrada.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
    </div>
  );
}
