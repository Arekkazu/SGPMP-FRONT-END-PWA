import React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { useT } from '../../shared/i18n/useT';
import { Input } from '../../shared/design-system/Input';
import { Alert } from '../../shared/design-system/Alert';
import type { ApiError } from '../../shared/api/errors';
import type { AtributoDinamicoConfig } from '../types';

interface Props {
  config: AtributoDinamicoConfig[];
  loading: boolean;
  error: ApiError | null;
  /** Aún no hay especie válida: no hay configuración que consultar. */
  sinEspecie: boolean;
  registrar: (cfg: AtributoDinamicoConfig) => UseFormRegisterReturn;
  errorDe: (cfg: AtributoDinamicoConfig) => string | undefined;
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  margin: '0 0 var(--s3)',
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 'var(--s4)',
};

const NOTA: React.CSSProperties = { fontSize: '12px', color: 'var(--text-muted)', margin: 0 };

const CHECK: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--s2)',
  minHeight: 'var(--s9)',
  fontSize: '14px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

function etiqueta(cfg: AtributoDinamicoConfig): string {
  return cfg.unidad_medida ? `${cfg.nombre} (${cfg.unidad_medida})` : cfg.nombre;
}

/** Controles de `atributos_dinamicos` generados desde la configuración de la especie (RF-33). */
export function AtributosDinamicosFields({ config, loading, error, sinEspecie, registrar, errorDe }: Props) {
  const { t } = useT('biologicalAssets');

  let contenido: React.ReactNode;
  if (sinEspecie) {
    contenido = <p style={NOTA}>{t('atributosdinamicos.indica_la_especie')}</p>;
  } else if (loading) {
    contenido = <p style={NOTA} aria-live="polite">{t('atributosdinamicos.cargando')}</p>;
  } else if (error) {
    contenido = (
      <Alert
        variant="warning"
        title={t('atributosdinamicos.no_se_pudo_cargar')}
        description={t('atributosdinamicos.se_validara_al_registrar')}
      />
    );
  } else if (config.length === 0) {
    contenido = <p style={NOTA}>{t('atributosdinamicos.sin_atributos')}</p>;
  } else {
    contenido = (
      <div style={GRID}>
        {config.map((cfg) => {
          if (cfg.tipo_dato === 'BOOLEANO') {
            return (
              <label key={cfg.id} style={CHECK}>
                <input type="checkbox" style={{ accentColor: 'var(--brand-500)' }} {...registrar(cfg)} />
                {etiqueta(cfg)}
              </label>
            );
          }
          const numerico = cfg.tipo_dato === 'NUMERICO' || cfg.tipo_dato === 'ENTERO';
          return (
            <Input
              key={cfg.id}
              id={`atributo-${cfg.id}`}
              label={etiqueta(cfg)}
              required={cfg.es_obligatorio}
              type={numerico ? 'number' : 'text'}
              step={cfg.tipo_dato === 'ENTERO' ? 1 : numerico ? 'any' : undefined}
              min={cfg.valor_min ?? undefined}
              max={cfg.valor_max ?? undefined}
              placeholder={cfg.es_obligatorio ? undefined : t('registraractivoform.opcional')}
              error={errorDe(cfg)}
              {...registrar(cfg)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 'var(--s6)' }}>
      <span style={SECTION_TITLE}>{t('atributosdinamicos.titulo')}</span>
      {contenido}
    </div>
  );
}
