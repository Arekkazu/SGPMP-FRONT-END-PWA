import React, { useEffect, useId, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Check, Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { useTemaVisual } from '../hooks/useTemaVisual';
import { THEME_MODE } from '../../shared/tema/tema';
import { FuenteBadge, type Fuente } from './FuenteBadge';

// theme_mode segun RF-27 y el backend: 1=Claro, 2=Oscuro, 3=Sistema. Los valores salen
// de `shared/tema/tema.ts` y no se escriben aqui: esta lista los tenia como 0/1/2, asi
// que guardar "Claro" enviaba 0 y el backend respondia 422, y "Oscuro" se persistia como
// Claro. Los colores de la miniatura replican las superficies reales de `tokens.css`
// de cada tema a proposito: muestran el otro tema, no el activo.
const TEMAS: { mode: number; clave: string; icono: LucideIcon; preview: { bg: string; text: string; sidebar: string } }[] = [
  { mode: THEME_MODE.CLARO, clave: 'claro', icono: Sun, preview: { bg: '#ffffff', text: '#252820', sidebar: '#f0f1ee' } },
  { mode: THEME_MODE.OSCURO, clave: 'oscuro', icono: Moon, preview: { bg: '#171a15', text: '#d4e0ce', sidebar: '#0f110e' } },
  {
    mode: THEME_MODE.SISTEMA,
    clave: 'automatico',
    icono: SunMoon,
    preview: { bg: 'linear-gradient(135deg,#ffffff 50%,#171a15 50%)', text: '#585e53', sidebar: '#e2e4de' },
  },
];

function TemaCard({ clave, icono: Icono, preview, selected, onClick }: {
  clave: string; icono: LucideIcon;
  preview: { bg: string; text: string; sidebar: string };
  selected: boolean; onClick: () => void;
}) {
  const { t } = useT('configuration');
  return (
    <OptionCard selected={selected} onClick={onClick} style={{ position: 'relative' }}>
      {/* Miniatura decorativa del tema */}
      <div aria-hidden="true" style={{
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
        <Icono size={20} strokeWidth={1.5} color="var(--brand-600)" aria-hidden />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t(`temavisualsection.tema_${clave}`)}</span>
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t(`temavisualsection.tema_${clave}_desc`)}</span>

      {selected && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 8, right: 8, width: 20, height: 20,
          borderRadius: 'var(--r-full)', background: 'var(--brand-cta)', color: 'var(--text-inverse)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={12} strokeWidth={2.5} />
        </span>
      )}
    </OptionCard>
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
  fuente: Fuente;
  canSave: boolean;
  saving: boolean;
  saveError: ReturnType<typeof useTemaVisual>['saveError'];
  onSave: (mode: number) => Promise<void>;
}) {
  const { t } = useT('configuration');
  const id = useId();
  const [selected, setSelected] = useState(currentMode);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSelected(currentMode); }, [currentMode]);

  const handleSave = async () => {
    setSaved(false);
    await onSave(selected);
    setSaved(true);
  };

  // TC-DIS-75: el panel es una seccion con su titulo como encabezado, y las
  // opciones un grupo nombrado por ese titulo y descrito por el subtitulo.
  return (
    <section aria-labelledby={`${id}-titulo`} style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--surface-border)',
      borderRadius: 'var(--r-xl)',
      padding: 'var(--s6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
        <div>
          <h3 id={`${id}-titulo`} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
          <p id={`${id}-subtitulo`} style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{subtitle}</p>
        </div>
        <FuenteBadge fuente={fuente} />
      </div>

      {saveError && (
        <Alert variant="error" title={t('temavisualsection.error_al_guardar')} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saved && !saveError && (
        <Alert variant="success" title={t('temavisualsection.tema_guardado')} description={t('temavisualsection.el_tema_se_aplico_correctamente')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div
        role="group"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-subtitulo`}
        className="ds-fg3"
        style={{ gap: 'var(--s3)', marginBottom: 'var(--s5)' }}
      >
        {TEMAS.map((tema) => (
          <TemaCard
            key={tema.mode}
            {...tema}
            selected={selected === tema.mode}
            onClick={() => { setSelected(tema.mode); setSaved(false); }}
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
        >{t('temavisualsection.guardar_tema')}</Button>
      </div>
    </section>
  );
}

export function TemaVisualSection() {
  const { t } = useT('configuration');
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
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('temavisualsection.tema_visual')}</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>{t('temavisualsection.selecciona_el_modo_de_color_de_la_interfaz')}</p>
      </div>

      {!online && (
        <Alert variant="warning" title={t('temavisualsection.sin_conexion')} description={t('temavisualsection.las_acciones_de_escritura_estan')} style={{ marginBottom: 'var(--s5)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('temavisualsection.error_al_cargar')} description={error.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {personal && (
          <TemaPanel
            title={t('temavisualsection.mi_preferencia')}
            subtitle={t('temavisualsection.mi_preferencia_desc')}
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
            title={t('temavisualsection.tema_global')}
            subtitle={t('temavisualsection.tema_global_desc')}
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
