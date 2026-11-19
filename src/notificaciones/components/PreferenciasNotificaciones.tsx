// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-18 | Arekkazu | M08 RF-105 R6: elegir por nivel si llegan también por push y correo |
import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { http } from '../../shared/api/http';
import type { ApiError } from '../../shared/api/errors';
import { Alert } from '../../shared/design-system/Alert';
import { avisarExito } from '../../shared/hooks/useToast';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { useT } from '../../shared/i18n/useT';

type Nivel = 'CRITICA' | 'ADVERTENCIA' | 'INFORMATIVA';
type Canal = 'IN_APP' | 'PUSH' | 'EMAIL';
interface Preferencia { nivel: Nivel; canal: Canal; habilitado: boolean; por_defecto: boolean; editable: boolean }

const NIVELES: Nivel[] = ['CRITICA', 'ADVERTENCIA', 'INFORMATIVA'];
const CANALES: Canal[] = ['IN_APP', 'PUSH', 'EMAIL'];

/**
 * RF-105 R6: por cada nivel, si el aviso llega además por push y por correo. La bandeja siempre está activa (no se
 * puede apagar). Sin elegir nada rigen los valores por defecto: push en crítica y advertencia, correo en crítica.
 */
export function PreferenciasNotificaciones() {
  const { t } = useT('notificaciones');
  const online = useOnlineStatus();
  const [prefs, setPrefs] = useState<Preferencia[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);

  useEffect(() => {
    http.get<Preferencia[]>('/notificaciones/preferencias').then((r) => setPrefs(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setError(e as ApiError));
  }, []);

  const cambiar = async (p: Preferencia, habilitado: boolean) => {
    const clave = `${p.nivel}-${p.canal}`;
    setGuardando(clave);
    setError(null);
    try {
      const { data } = await http.put<Preferencia[]>('/notificaciones/preferencias',
        { preferencias: [{ nivel: p.nivel, canal: p.canal, habilitado }] });
      setPrefs(data);
      avisarExito('guardado', t(`preferencias.nivel.${p.nivel}`));
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setGuardando(null);
    }
  };

  return (
    <section aria-labelledby="titulo-preferencias" style={{
      background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)',
      padding: 'var(--s5)', marginTop: 'var(--s5)',
    }}>
      <h2 id="titulo-preferencias" style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center', fontSize: 'var(--fs-heading-sm)', margin: 0 }}>
        <BellRing size={18} aria-hidden /> {t('preferencias.titulo')}
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: 'var(--s2) 0 var(--s4)' }}>{t('preferencias.descripcion')}</p>
      {error && <Alert variant="error" title={t('preferencias.error')} description={error.message} onDismiss={() => setError(null)} />}
      {prefs && (
        <div className="ds-scroll-region" tabIndex={0} role="region" aria-label={t('preferencias.titulo')} style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left', padding: 'var(--s2)' }}>{t('preferencias.col_nivel')}</th>
                {CANALES.map((c) => <th key={c} scope="col" style={{ padding: 'var(--s2)' }}>{t(`preferencias.canal.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {NIVELES.map((nivel) => (
                <tr key={nivel} style={{ borderTop: '1px solid var(--surface-border)' }}>
                  <th scope="row" style={{ textAlign: 'left', padding: 'var(--s2)' }}>{t(`preferencias.nivel.${nivel}`)}</th>
                  {CANALES.map((canal) => {
                    const p = prefs.find((x) => x.nivel === nivel && x.canal === canal);
                    if (!p) return <td key={canal} />;
                    return (
                      <td key={canal} style={{ textAlign: 'center', padding: 'var(--s2)' }}>
                        <input type="checkbox" checked={p.habilitado} disabled={!p.editable || !online || guardando !== null}
                               aria-label={t('preferencias.aria', { nivel: t(`preferencias.nivel.${nivel}`), canal: t(`preferencias.canal.${canal}`) })}
                               onChange={(e) => void cambiar(p, e.target.checked)}
                               style={{ width: 20, height: 20 }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 'var(--fs-body-sm)', color: 'var(--text-secondary)', marginTop: 'var(--s3)' }}>{t('preferencias.nota')}</p>
    </section>
  );
}
