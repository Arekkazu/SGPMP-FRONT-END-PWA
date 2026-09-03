import React, { useEffect } from 'react';
import { useT } from '../../shared/i18n/useT';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '../../shared/auth/useAuth';
import { Alert } from '../../shared/design-system/Alert';
import { useDashboardLayout } from '../../configuration/hooks/useDashboardLayout';
import { WidgetCard } from '../components/WidgetCard';
import './DashboardPage.css';

export function DashboardPage() {
  const { t } = useT('dashboard');
  const { claims } = useAuth();
  // El layout que el usuario guardo en Configuracion → Personalizacion es el que
  // manda aca. Antes esta pagina era estatica y la configuracion no se aplicaba
  // en ningun lado.
  const { datos, loading, error, cargarDatos } = useDashboardLayout();

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s7)' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Bienvenido{claims?.nombre ? `, ${claims.nombre}` : ''}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('dashboardpage.sgp_multiespecie_sistema_de_gestion_pecuaria')}</p>
      </div>

      {error && (
        <Alert
          variant="error"
          title={t('dashboardpage.no_se_pudo_cargar_el_dashboard')}
          description={error.message}
          style={{ marginBottom: 'var(--s5)' }}
        />
      )}

      {loading ? (
        <div className="dashboard-grid" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 150,
                borderRadius: 'var(--r-xl)',
                background: 'var(--surface-hover)',
                animation: 'pulse 1.4s infinite',
              }}
            />
          ))}
        </div>
      ) : datos.length > 0 ? (
        <div className="dashboard-grid">
          {datos.map((w) => <WidgetCard key={w.id_widget} widget={w} />)}
        </div>
      ) : (
        <div
          style={{
            padding: 'var(--s6)',
            background: 'var(--surface-card)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--r-xl)',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--s3)',
          }}
        >
          <LayoutGrid size={24} aria-hidden />
          Tu dashboard no tiene widgets configurados. Agrégalos desde
          Configuración → Personalización.
        </div>
      )}
    </div>
  );
}
