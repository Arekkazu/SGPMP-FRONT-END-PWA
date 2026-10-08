import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { FECHA_NUMERICA, formatearFecha } from '../../shared/i18n/formato';
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
import { metricasApi, patologiasApi } from '../../configuration/api/especiesConfigApi';
import { activosApi } from '../api/activosApi';

type ModalTipo = 'ninguno' | 'crecimiento' | 'sanitario' | 'reproductivo' | 'productivo' | 'baja';

interface Props {
  idActivo: number;
  idEspecie?: number | null;
  tipo: string;
  estadoActual: string | null;
  /** Cantidad actual del lote (ficha integral); acota la baja parcial. */
  cantidadDisponible?: number | null;
  /** M2-03: true cuando la ficha confirma que no hay fase productiva activa. */
  sinFase?: boolean;
  onIrAFases?: () => void;
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

export function EventosSection({ idActivo, idEspecie, tipo, estadoActual, cantidadDisponible, sinFase = false, onIrAFases, onChanged }: Props) {
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
  const [configLoading, setConfigLoading] = useState(false);
  const [patologias, setPatologias] = useState<{ id_patologia: number; nombre: string }[]>([]);
  const [metricas, setMetricas] = useState<{ id_metrica_produccion: number; nombre: string; tipo_medicion: string; unidad_medida: string }[]>([]);
  // #290 §3: el padre se elige entre los individuales de la misma especie, no por número.
  const [candidatosPadre, setCandidatosPadre] = useState<{ id: number; etiqueta: string }[]>([]);
  useEffect(() => {
    if (modal !== 'reproductivo' || esPoblacional || idEspecie == null) return;
    activosApi.listar({ tipo: 'INDIVIDUAL', id_especie: idEspecie, page_size: 100 })
      .then((pagina) => setCandidatosPadre(pagina.registros
        .filter((a) => a.id_activo_biologico !== idActivo)
        .map((a) => ({ id: a.id_activo_biologico, etiqueta: `${a.identificador ?? ''} (#${a.id_activo_biologico})`.trim() }))))
      .catch(() => setCandidatosPadre([]));
  }, [modal, esPoblacional, idEspecie, idActivo]);
  useEffect(() => {
    if (esPoblacional) cargar();
  }, [esPoblacional, cargar]);
  useEffect(() => {
    if (idEspecie == null || modal === 'ninguno') return;
    setConfigLoading(true);
    Promise.all([
      patologiasApi.listar(idEspecie, true),
      metricasApi.listar(idEspecie, true),
    ]).then(([patologiasData, metricasData]) => {
      setPatologias(patologiasData.map((p) => ({ id_patologia: p.id_patologia, nombre: p.nombre })));
      setMetricas(metricasData.map((m) => ({
        id_metrica_produccion: m.id_metrica_produccion,
        nombre: m.nombre,
        tipo_medicion: m.tipo_medicion,
        unidad_medida: m.unidad_medida,
      })));
    }).finally(() => setConfigLoading(false));
  }, [idEspecie, modal]);

  const refrescar = useCallback(async () => {
    if (esPoblacional) await cargar();
    onChanged();
  }, [esPoblacional, cargar, onChanged]);

  const abrir = (m: ModalTipo) => { setSaveError(null); setAviso(null); setModal(m); };
  const cerrar = () => setModal('ninguno');

  // M2-03: el backend exige fase activa en crecimiento, reproductivo y productivo
  // (SIN_FASE_ACTIVA); se avisa antes de llenar el formulario, no al fallar.
  const botones: { id: ModalTipo; label: string; icon: React.ReactNode; requiereFase?: boolean }[] = [
    { id: 'crecimiento', label: 'Crecimiento', icon: <TrendingUp size={15} aria-hidden />, requiereFase: true },
    { id: 'sanitario', label: 'Sanitario', icon: <Stethoscope size={15} aria-hidden /> },
    { id: 'reproductivo', label: 'Reproductivo', icon: <Baby size={15} aria-hidden />, requiereFase: true },
    { id: 'productivo', label: 'Productivo', icon: <Package size={15} aria-hidden />, requiereFase: true },
    { id: 'baja', label: 'Baja', icon: <ArrowDownCircle size={15} aria-hidden /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Acciones de registro */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('eventossection.registrar_evento')}</h2>
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            {puedeCrear && botones.map((b) => (
              <Button
                key={b.id}
                variant={b.id === 'baja' ? 'danger' : 'secondary'}
                size="sm"
                disabled={!online || !permite || (sinFase && !!b.requiereFase)}
                title={sinFase && b.requiereFase ? t('eventossection.requiere_fase') : undefined}
                onClick={() => abrir(b.id)}
              >
                <span style={{ marginRight: 'var(--s1)', display: 'inline-flex' }}>{b.icon}</span>
                {b.label}
              </Button>
            ))}
          </div>
        </div>
        {!permite && (
          <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', margin: 'var(--s3) 0 0' }}>
            El activo está en estado «{estadoActual}». Solo se pueden registrar eventos en ACTIVO, EN TRATAMIENTO o AISLADO.
          </p>
        )}
        {permite && sinFase && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', flexWrap: 'wrap', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', margin: 'var(--s3) 0 0' }}>
            {t('eventossection.requiere_fase')}
            {onIrAFases && <Button variant="ghost" size="sm" onClick={onIrAFases}>{t('eventossection.ir_a_fases')}</Button>}
          </p>
        )}
        {aviso && (
          <Alert variant="success" title={t('eventossection.evento_registrado')} description={aviso} style={{ marginTop: 'var(--s4)' }} />
        )}
      </div>

      {/* Historial de eventos (solo POBLACIONAL). #298 3.4: en un individual la
          tarjeta solo decía que no aplicaba; sus eventos están en Historial. */}
      {esPoblacional && (
      <div style={CARD}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--s4)' }}>{t('eventossection.historial_de_eventos')}</h2>
        {loading ? (
          <div style={{ height: 100, borderRadius: 'var(--r-md)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }}>
            <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
          </div>
        ) : error && error.status !== 409 ? (
          <Alert variant="error" title={t('eventossection.error_al_cargar_eventos')} description={error.message} />
        ) : eventos.length === 0 ? (
          <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-muted)', margin: 0 }}>{t('eventossection.sin_eventos_registrados')}</p>
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
                    <div style={{ fontSize: 'var(--fs-body-md)', fontWeight: 600, color: 'var(--text-primary)' }}>{r.tipo}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.detalle}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatearFecha(ev.fecha, FECHA_NUMERICA)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}

      {/* Modales */}
      {modal === 'crecimiento' && (
        <EventoCrecimientoForm
          metricas={metricas}
          metricasLoading={configLoading}
          esPoblacional={esPoblacional}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarCrecimiento(dto);
            if (res) { setAviso(res.fase_avanzada ? t('eventossection.registrado_se_avanzo_de_fase_automaticamente') : t('eventossection.evento_de_crecimiento_registrado')); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'sanitario' && (
        <EventoSanitarioForm
          patologias={patologias}
          patologiasLoading={configLoading}
          saving={saving}
          saveError={saveError}
          onClose={cerrar}
          onConfirmar={async (dto) => {
            const res = await registrarSanitario(dto);
            if (res) { setAviso(res.cambio_estado ? t('eventossection.registrado_se_aplico_un_cambio_de_estado') : 'Evento sanitario registrado.'); await refrescar(); return true; }
            return false;
          }}
        />
      )}
      {modal === 'reproductivo' && (
        <EventoReproductivoForm
          esPoblacional={esPoblacional}
          candidatosPadre={candidatosPadre}
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
          cantidadDisponible={cantidadDisponible}
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
