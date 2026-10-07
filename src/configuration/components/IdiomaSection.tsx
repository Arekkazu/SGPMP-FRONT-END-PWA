import React, { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { OptionCard } from '../../shared/design-system/OptionCard';
import { FuenteBadge, type Fuente } from './FuenteBadge';
import { useIdioma } from '../hooks/useIdioma';
import { useT } from '../../shared/i18n/useT';

// Los códigos son los que acepta `locale_code` en el backend. Enviar 'es' o
// 'en' devuelve 400 IDIOMA_NO_DISPONIBLE, que es lo que ocurría antes de este
// cambio: guardar siempre fallaba y ninguna tarjeta se marcaba como activa,
// porque 'es-CO' nunca igualaba a 'es'.
//
// El nombre de cada idioma va en su propio idioma a propósito (Español /
// English), no traducido: es la convención de todo selector de idioma, para que
// alguien que no entiende la interfaz actual reconozca la opción que busca.
const IDIOMAS = [
  {
    code: 'es-CO',
    label: 'Español',
    region: 'Colombia',
    flag: '🇨🇴',
    sample: 'Bienvenido al sistema',
  },
  {
    code: 'en-US',
    label: 'English',
    region: 'United States',
    flag: '🇺🇸',
    sample: 'Welcome to the system',
  },
] as const;

function IdiomaCard({ label, region, flag, sample, selected, onClick }: {
  label: string; region: string; flag: string; sample: string;
  selected: boolean; onClick: () => void;
}) {
  return (
    <OptionCard
      selected={selected}
      onClick={onClick}
      style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 'var(--s4)' }}
    >
      {/* La bandera acompaña al nombre del idioma: decorativa para el lector. */}
      <span aria-hidden="true" style={{ fontSize: '36px', lineHeight: 1, flexShrink: 0 }}>{flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--s2)' }}>{region}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{sample}"</div>
      </div>

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

function IdiomaPanel({
  title,
  subtitle,
  currentCode,
  fuente,
  canSave,
  saving,
  saveError,
  onSave,
}: {
  title: string;
  subtitle: string;
  currentCode: string;
  fuente: Fuente;
  canSave: boolean;
  saving: boolean;
  saveError: ReturnType<typeof useIdioma>['saveError'];
  onSave: (code: string) => Promise<boolean>;
}) {
  const { t } = useT('configuration');
  const id = useId();
  const [selected, setSelected] = useState(currentCode);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSelected(currentCode); }, [currentCode]);

  const handleSave = async () => {
    setSaved(false);
    const ok = await onSave(selected);
    // Antes se marcaba "guardado" pasara lo que pasara, así que un 400 mostraba
    // el error y la confirmación de éxito al mismo tiempo.
    setSaved(ok);
  };

  // TC-DIS-81: seccion con encabezado y grupo de opciones nombrado (igual que Tema).
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
        <Alert variant="error" title={t('errores.titulo_guardar', { ns: 'common' })} description={saveError.message} style={{ marginBottom: 'var(--s4)' }} />
      )}
      {saved && !saveError && (
        <Alert variant="success" title={t('idioma.guardado_titulo')} description={t('idioma.guardado_detalle')} style={{ marginBottom: 'var(--s4)' }} />
      )}

      <div
        role="group"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-subtitulo`}
        className="ds-fg2"
        style={{ gap: 'var(--s3)', marginBottom: 'var(--s5)' }}
      >
        {IDIOMAS.map((idioma) => (
          <IdiomaCard
            key={idioma.code}
            {...idioma}
            selected={selected === idioma.code}
            onClick={() => { setSelected(idioma.code); setSaved(false); }}
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
          {t('idioma.guardar')}
        </Button>
      </div>
    </section>
  );
}

export function IdiomaSection() {
  const { t } = useT('configuration');
  const online = useOnlineStatus();
  const puedePersonal = usePermission(26, 3);
  const puedeGlobal = usePermission(27, 3);

  const { personal, global_, loading, saving, error, saveError, cargar, guardar, guardarGlobal } = useIdioma();

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ height: 180, borderRadius: 'var(--r-xl)', background: 'var(--surface-hover)', animation: 'pulse 1.4s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('idioma.titulo')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--s1)', marginBottom: 0 }}>
          {t('idioma.subtitulo')}
        </p>
      </div>

      {!online && (
        <Alert variant="warning" title={t('estados.sin_conexion', { ns: 'common' })} description={t('estados.sin_conexion_detalle', { ns: 'common' })} style={{ marginBottom: 'var(--s5)' }} />
      )}
      {error && (
        <Alert variant="error" title={t('errores.titulo_cargar', { ns: 'common' })} description={error.message} style={{ marginBottom: 'var(--s5)' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
        {personal && (
          <IdiomaPanel
            title={t('idioma.personal_titulo')}
            subtitle={t('idioma.personal_subtitulo')}
            currentCode={personal.locale_code}
            fuente={personal.fuente}
            canSave={online && puedePersonal}
            saving={saving}
            saveError={saveError}
            onSave={(code) => guardar({ locale_code: code, version_perfil: personal.version_perfil })}
          />
        )}

        {global_ && puedeGlobal && (
          <IdiomaPanel
            title={t('idioma.global_titulo')}
            subtitle={t('idioma.global_subtitulo')}
            currentCode={global_.locale_code}
            fuente="global"
            canSave={online && puedeGlobal}
            saving={saving}
            saveError={saveError}
            onSave={(code) => guardarGlobal({ locale_code: code, version_perfil: personal?.version_perfil })}
          />
        )}
      </div>
    </div>
  );
}
