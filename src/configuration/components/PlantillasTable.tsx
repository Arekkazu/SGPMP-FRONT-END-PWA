import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { usePlantillas } from '../hooks/usePlantillas';
import { useEspecies } from '../hooks/useEspecies';
import { PlantillaModal } from './PlantillaModal';
import { AplicarPlantillaWizard } from './AplicarPlantillaWizard';
import { PlantillaHistorial } from './PlantillaHistorial';
import type { PlantillaResponse, AplicacionPlantillaResponse } from '../types';

function ParamsBadges({ snapshot }: { snapshot: Record<string, unknown> }) {
  const keys = Object.keys(snapshot).filter((k) => snapshot[k]);
  if (keys.length === 0) return <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {keys.map((k) => (
        <span key={k} style={{
          fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-mono)',
          padding: '2px 6px', borderRadius: 'var(--r-full)',
          background: 'var(--surface-hover)', border: '1px solid var(--surface-border)',
          color: 'var(--text-secondary)',
        }}>
          {k}
        </span>
      ))}
    </div>
  );
}

interface PlantillaCardProps {
  plantilla: PlantillaResponse;
  especieNombre: string;
  puedeAplicar: boolean;
  online: boolean;
  onAplicar: () => void;
}

function PlantillaCard({ plantilla, especieNombre, puedeAplicar, online, onAplicar }: PlantillaCardProps) {
  return (
    <div style={{
      background: 'var(--surface-card)', border: '1px solid var(--surface-border)',
      borderRadius: 'var(--r-xl)', padding: 'var(--s5)',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-400)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--surface-border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--brand-400)' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--s3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--s1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plantilla.template_name}
          </div>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '2px 7px', borderRadius: 'var(--r-full)', background: 'var(--surface-hover)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 'var(--s2)' }}>
          v{plantilla.version}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s3)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-600)', background: 'var(--brand-50, #f0f7ee)', border: '1px solid var(--brand-200, #b2d8b5)', borderRadius: 'var(--r-full)', padding: '2px 7px' }}>
          🌿 {especieNombre}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {new Date(plantilla.fecha_creacion).toLocaleDateString('es-CO')}
        </span>
      </div>

      <div style={{ marginBottom: 'var(--s4)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>Parámetros incluidos:</div>
        <ParamsBadges snapshot={plantilla.params_snapshot} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          🔒 Inmutable
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={!puedeAplicar || !online}
          onClick={onAplicar}
        >
          Aplicar plantilla
        </Button>
      </div>
    </div>
  );
}

export function PlantillasTable() {
  const online = useOnlineStatus();
  const puedeCrear = usePermission(28, 1);
  const puedeAplicar = usePermission(28, 5);

  const { plantillas, historial, loading, loadingHistorial, saving, error, saveError, listar, registrar, aplicar, cargarHistorial } = usePlantillas();
  const { especies, cargar: cargarEspecies } = useEspecies();

  const [showModal, setShowModal] = useState(false);
  const [wizardPlantilla, setWizardPlantilla] = useState<PlantillaResponse | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);
  const [wizardResult, setWizardResult] = useState<AplicacionPlantillaResponse | null>(null);

  useEffect(() => { listar(); cargarEspecies(); }, [listar, cargarEspecies]);

  const getEspecieNombre = (idEspecie: number) =>
    especies.find((e) => e.id_especie === idEspecie)?.nombre ?? `Especie #${idEspecie}`;

  const handleAplicar = async (idEspecieDestino: number, fechaCreacion: string): Promise<AplicacionPlantillaResponse | null> => {
    if (!wizardPlantilla) return null;
    const result = await aplicar(wizardPlantilla.id_plantilla, { id_especie_destino: idEspecieDestino, fecha_creacion_especie_destino: fechaCreacion });
    if (result) setWizardResult(result);
    return result;
  };

  const toggleHistorial = () => {
    if (!showHistorial) cargarHistorial();
    setShowHistorial((v) => !v);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s5)' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Plantillas de Configuración
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
            Captura y aplica configuraciones completas entre especies
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)' }}>
          <Button variant="ghost" size="sm" onClick={() => listar()} aria-label="Recargar">
            <RefreshCw size={15} aria-hidden />
          </Button>
          {puedeCrear && (
            <Button variant="primary" size="sm" disabled={!online} onClick={() => setShowModal(true)}>
              <Plus size={15} aria-hidden style={{ marginRight: 'var(--s1)' }} />
              Nueva plantilla
            </Button>
          )}
        </div>
      </div>

      {!online && (
        <Alert variant="warning" title="Sin conexión" description="Mostrando datos cargados. Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s4)' }} />
      )}
      {error && (
        <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--s4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 200, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
          ))}
        </div>
      ) : plantillas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--s8) 0' }}>
          <div style={{ fontSize: '32px', marginBottom: 'var(--s3)' }}>📋</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--s2)' }}>Sin plantillas creadas</div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Crea la primera plantilla para capturar una configuración base.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}>
          {plantillas.map((p) => (
            <PlantillaCard
              key={p.id_plantilla}
              plantilla={p}
              especieNombre={getEspecieNombre(p.id_especie)}
              puedeAplicar={puedeAplicar}
              online={online}
              onAplicar={() => { setWizardResult(null); setWizardPlantilla(p); }}
            />
          ))}
        </div>
      )}

      {/* Historial toggle */}
      <button
        type="button"
        onClick={toggleHistorial}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', cursor: 'pointer', padding: 'var(--s4) 0', borderTop: '1px solid var(--surface-border)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
      >
        {showHistorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Historial de aplicaciones
      </button>
      {showHistorial && (
        <div style={{ marginTop: 'var(--s4)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s5)', background: 'var(--surface-hover)', borderBottom: '1px solid var(--surface-border)', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Aplicaciones recientes
          </div>
          <PlantillaHistorial historial={historial} loading={loadingHistorial} />
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <PlantillaModal
          saving={saving}
          saveError={saveError}
          onClose={() => setShowModal(false)}
          onRegistrar={registrar}
        />
      )}

      {wizardPlantilla && (
        <AplicarPlantillaWizard
          plantilla={wizardPlantilla}
          saving={saving}
          saveError={saveError}
          onClose={() => setWizardPlantilla(null)}
          onAplicar={handleAplicar}
        />
      )}
    </div>
  );
}
