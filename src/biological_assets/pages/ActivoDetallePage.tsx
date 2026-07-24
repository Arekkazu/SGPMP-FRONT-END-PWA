import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useActivoDetalle } from '../hooks/useActivoDetalle';
import { useFichaIntegral } from '../hooks/useFichaIntegral';
import { ActivoHeader } from '../components/ActivoHeader';
import { FichaIntegralView } from '../components/FichaIntegralView';
import { DatosActivoSection } from '../components/DatosActivoSection';
import { EstadoSection } from '../components/EstadoSection';
import { FasesSection } from '../components/FasesSection';
import { EventosSection } from '../components/EventosSection';
import { InfraestructuraSection } from '../components/InfraestructuraSection';
import { SensoresSection } from '../components/SensoresSection';
import { HistorialSection } from '../components/HistorialSection';
import { IndicadoresSection } from '../components/IndicadoresSection';
import { DatosAnaliticosSection } from '../components/DatosAnaliticosSection';

type TabId =
  | 'ficha' | 'datos' | 'estado' | 'fases' | 'eventos'
  | 'historial' | 'infraestructura' | 'sensores' | 'indicadores' | 'analisis';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ficha', label: 'Ficha integral' },
  { id: 'datos', label: 'Datos' },
  { id: 'estado', label: 'Estado' },
  { id: 'fases', label: 'Fases' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'historial', label: 'Historial' },
  { id: 'infraestructura', label: 'Infraestructura' },
  { id: 'sensores', label: 'Sensores' },
  { id: 'indicadores', label: 'Indicadores' },
  { id: 'analisis', label: 'Análisis' },
];

const TAB_BTN: React.CSSProperties = {
  padding: 'var(--s3) var(--s4)',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: 'var(--text-secondary)',
  fontWeight: 400,
  fontSize: '14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  marginBottom: -1,
};

const TAB_BTN_ACTIVE: React.CSSProperties = {
  ...TAB_BTN,
  borderBottomColor: 'var(--brand-500)',
  color: 'var(--brand-600)',
  fontWeight: 600,
};

export function ActivoDetallePage() {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const idActivo = Number(id);
  const idValido = Number.isFinite(idActivo) && idActivo > 0;

  const { activo, loading, saving, error, saveError, cargar, actualizarIndividual } = useActivoDetalle(idActivo);
  const { ficha, loading: fichaLoading, cargar: cargarFicha } = useFichaIntegral(idActivo);
  const [tab, setTab] = useState<TabId>('ficha');

  const refrescar = useCallback(() => {
    cargar();
    cargarFicha();
  }, [cargar, cargarFicha]);

  useEffect(() => {
    if (idValido) refrescar();
  }, [idValido, refrescar]);

  if (!idValido) {
    return (
      <div style={{ padding: 'var(--s7)' }}>
        <Alert variant="error" title="Activo inválido" description="El identificador de la ruta no es válido." />
      </div>
    );
  }

  const identificador = ficha?.identificador ?? activo?.identificador ?? null;
  const tipo = ficha?.tipo ?? activo?.tipo ?? 'INDIVIDUAL';
  const estado = ficha?.estado_actual ?? activo?.nombre_estado ?? null;

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface-bg)' }}>
      {/* Header + volver */}
      <div style={{ padding: 'var(--s5) var(--s7) 0' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => history.push('/activos-biologicos')}
          style={{ marginBottom: 'var(--s3)' }}
        >
          <ArrowLeft size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
          Volver a la lista
        </Button>

        {error && (
          <Alert
            variant="error"
            title="No se pudo cargar el activo"
            description={error.status === 404 ? 'El activo no existe o fue eliminado.' : error.message}
            style={{ marginBottom: 'var(--s4)' }}
          />
        )}

        <ActivoHeader
          idActivo={idActivo}
          identificador={identificador}
          tipo={String(tipo)}
          estado={estado}
          especie={ficha?.especie}
          infraestructura={ficha?.infraestructura_asociada}
          fase={ficha?.fase_productiva_activa}
          diasEnSistema={ficha?.dias_en_sistema}
        />
      </div>

      {/* Tab bar */}
      <nav
        style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0 var(--s7)', overflowX: 'auto', marginTop: 'var(--s5)' }}
        aria-label="Secciones del activo"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            style={tab === t.id ? TAB_BTN_ACTIVE : TAB_BTN}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Contenido */}
      <div style={{ padding: 'var(--s7)' }}>
        {tab === 'ficha' && <FichaIntegralView ficha={ficha} loading={fichaLoading || loading} />}
        {tab === 'datos' && (
          <DatosActivoSection
            activo={activo}
            loading={loading}
            saving={saving}
            saveError={saveError}
            onGuardar={actualizarIndividual}
            onChanged={refrescar}
          />
        )}
        {tab === 'estado' && (
          <EstadoSection
            idActivo={idActivo}
            estadoActual={estado}
            identificador={identificador}
            onChanged={refrescar}
          />
        )}
        {tab === 'fases' && <FasesSection idActivo={idActivo} onChanged={refrescar} />}
        {tab === 'eventos' && (
          <EventosSection
            idActivo={idActivo}
            tipo={String(tipo)}
            estadoActual={estado}
            onChanged={refrescar}
          />
        )}
        {tab === 'historial' && <HistorialSection idActivo={idActivo} />}
        {tab === 'infraestructura' && <InfraestructuraSection idActivo={idActivo} onChanged={refrescar} />}
        {tab === 'sensores' && (
          <SensoresSection
            idActivo={idActivo}
            esPoblacional={String(tipo).toUpperCase() === 'POBLACIONAL'}
            idInfraestructura={activo?.id_infraestructura ?? null}
          />
        )}
        {tab === 'indicadores' && <IndicadoresSection idActivo={idActivo} />}
        {tab === 'analisis' && <DatosAnaliticosSection idActivo={idActivo} />}
      </div>
    </div>
  );
}
