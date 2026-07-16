import React from 'react';
import { Users, Shield, Activity, User } from 'lucide-react';
import { useAuth } from '../../shared/auth/useAuth';

const KPI_CARDS = [
  { icon: Users, label: 'Usuarios activos', value: '—', color: 'var(--brand-500)' },
  { icon: Shield, label: 'Roles configurados', value: '—', color: 'var(--sem-info)' },
  { icon: Activity, label: 'Eventos de auditoría hoy', value: '—', color: 'var(--sem-warning)' },
  { icon: User, label: 'Mi último acceso', value: '—', color: 'var(--sem-success)' },
];

export function DashboardPage() {
  const { claims } = useAuth();

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s7)' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Bienvenido{claims?.nombre ? `, ${claims.nombre}` : ''}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          SGP Multiespecie — Sistema de Gestión Pecuaria
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 'var(--s5)',
        }}
      >
        {KPI_CARDS.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--r-xl)',
              padding: 'var(--s5)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s4)' }}>
              <div
                style={{
                  width: 40, height: 40,
                  borderRadius: 'var(--r-md)',
                  background: `${color}1a`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-hidden
              >
                <Icon size={20} color={color} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
            </div>
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 'var(--s7)',
          padding: 'var(--s5)',
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--r-xl)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        Los indicadores del dashboard estarán disponibles en próximas versiones.
      </div>
    </div>
  );
}
