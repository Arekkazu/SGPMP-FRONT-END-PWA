import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { useTemaVisual } from '../hooks/useTemaVisual';

// theme_mode: 0=Light, 1=Dark, 2=Auto
const TEMAS = [
  {
    mode: 0,
    label: 'Claro',
    emoji: '☀️',
    desc: 'Interfaz con fondo blanco',
    preview: { bg: '#ffffff', text: '#1a1a1a', sidebar: '#f0f0f0' },
  },
  {
    mode: 1,
    label: 'Oscuro',
    emoji: '🌙',
    desc: 'Interfaz con fondo oscuro',
    preview: { bg: '#1e1e2e', text: '#cdd6f4', sidebar: '#181825' },
  },
  {
    mode: 2,
    label: 'Automático',
    emoji: '⚙️',
    desc: 'Sigue la preferencia del sistema',
    preview: { bg: 'linear-gradient(135deg,#ffffff 50%,#1e1e2e 50%)', text: '#666', sidebar: '#e8e8f0' },
  },
] as const;

function FuenteBadge({ fuente }: { fuente: 'personal' | 'global' | 'default' }) {
  const colors: Record<string, string> = {
    personal: 'var(--brand-500)',
    global: '#7c3aed',
    default: 'var(--text-muted)',
  };
  const labels: Record<string, string> = {
    personal: 'Personal',
    global: 'Global',
    default: 'Por defecto',
  };
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 600,
      color: colors[fuente],
      border: `1px solid ${colors[fuente]}`,
      borderRadius: 'var(--r-full)',
      padding: '1px var(--s2)',
    }}>
      {labels[fuente]}
    </span>
  );
}

function TemaCard({ mode, label, emoji, desc, preview, selected, onClick }: {
  mode: number; label: string; emoji: string; desc: string;
  preview: { bg: string; text: string; sidebar: string };
  selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: 'var(--s4)',
        background: 'var(--surface-card)',
        border: `2px solid ${selected ? 'var(--brand-500)' : 'var(--surface-border)'}`,
        borderRadius: 'var(--r-lg)',
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        transition: 'border-color 0.15s',
        width: '100%',
      }}
    >
      {/* Mini preview mockup */}
      <div style={{
        height: 64,
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        marginBottom: 'var(--s3)',
        display: 'flex',
        border: '1px solid var(--surface-border)',
      }}>
        <div style={{ width: 32, background: preview.sidebar }} />
        <div style={{ flex: 1, background: preview.bg, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 6, borderRadius: 2, background: preview.text, opacity: 0.4, width: '70%' }} />
          <div style={{ height: 6, borderRadius: 2, background: preview.text, opacity: 0.25, width: '50%' }} />
          <div style={{ height: 6, borderRadius: 2, background: preview.text, opacity: 0.15, width: '40%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s1)' }}>
        <span role="img" aria-label={label}>{emoji}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</span>

      {selected && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: 'var(--r-full)',
          background: 'var(--brand-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Check size={12} color="#fff" />
        </div>
      )}
    </button>
  );
}

function TemaPanel({
  title,
  subtitle,
  currentMode,
  fuente,
  canSave,
  saving,
  saveError,
  onSave,
}: {
  title: string;
  subtitle: string;
  currentMode: number;
  fuente: 'personal' | 'global' | 'default';
  canSave: boolean;
  saving: boolean;
  saveError: ReturnType<typeof useTemaVisual>['saveError'];
  onSave: (mode: number) => Promise<void>;
}) {
  const [selected, setSelected] = useState(currentMode);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSelected(currentMode); }, [currentMode]);

  const handleSave = async () => {
    setSaved(false);
    await onSave(selected);
    setSaved(true);
  };

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--r-xl)',
      padding: 'var(--s6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s4)' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <FuenteBadge fuente={fuente} />
      </div>

      {saveError && (
        <Alert variant="error" title="Error al guardar" description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saved && !saveError && (
        <Alert variant="success" title="Tema guardado" description="El tema se aplicó correctamente." style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--s3)', marginBottom: 'var(--s5)' }}>
        {TEMAS.map((t) => (
          <TemaCard
            key={t.mode}
            {...t}
            selected={selected === t.mode}
            onClick={() => { setSelected(t.mode); setSaved(false); }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="primary"
          size="md"
          loading={saving}
          disabled={!canSave || saving}
          onClick={handleSave}
        >
          Guardar tema
        </Button>
      </div>
    </div>
  );
}

export function TemaVisualSection() {
  const online = useOnlineStatus();
  const puedePersonal = usePermission(24, 3);
  const puedeGlobal = usePermission(27, 3);

  const { personal, global_, loading, saving, error, saveError, cargar, guardar, guardarGlobal } = useTemaVisual();

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ height: 220, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Tema Visual
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          Selecciona el modo de color de la interfaz
        </p>
      </div>

      {!online && (
        <Alert variant="warning" title="Sin conexión" description="Las acciones de escritura están deshabilitadas." style={{ marginBottom: 'var(--s5)' }} />
      )}
      {error && (
        <Alert variant="error" title="Error al cargar" description={error.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {personal && (
          <TemaPanel
            title="Mi preferencia"
            subtitle="Tema aplicado a tu cuenta de usuario"
            currentMode={personal.theme_mode}
            fuente={personal.fuente}
            canSave={online && puedePersonal}
            saving={saving}
            saveError={saveError}
            onSave={async (mode) => { await guardar({ theme_mode: mode }); }}
          />
        )}

        {global_ && puedeGlobal && (
          <TemaPanel
            title="Tema global"
            subtitle="Aplicado a todos los usuarios que no tienen preferencia personal"
            currentMode={global_.theme_mode}
            fuente={global_.fuente}
            canSave={online && puedeGlobal}
            saving={saving}
            saveError={saveError}
            onSave={async (mode) => { await guardarGlobal({ theme_mode: mode }); }}
          />
        )}
      </div>
    </div>
  );
}
