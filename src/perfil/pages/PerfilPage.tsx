import React, { useEffect, useState } from 'react';
import { formatearFecha, formatearFechaHora } from '../../shared/i18n/formato';
import { useT } from '../../shared/i18n/useT';
import { User, Lock, Edit2 } from 'lucide-react';
import { usePerfil } from '../hooks/usePerfil';
import { PerfilForm } from '../components/PerfilForm';
import { CambiarContrasenaForm } from '../components/CambiarContrasenaForm';
import { Alert } from '../../shared/design-system/Alert';
import { Badge } from '../../shared/design-system/Badge';

function mascararId(valor: string): string {
  if (valor.length <= 4) return valor;
  return valor.slice(0, 4) + ' ●●●●●●';
}

function formatFecha(fecha: string | undefined): string {
  if (!fecha) return '—';
  try {
    return formatearFecha(fecha, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return fecha;
  }
}

function formatFechaHora(fecha: string | undefined): string {
  if (!fecha) return '—';
  try {
    return formatearFechaHora(fecha, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return fecha;
  }
}

export function PerfilPage() {
  const { t } = useT('perfil');
  const { perfil, loading, error, saving, saveError, saveSuccess, pwError, pwSuccess, cargar, editar, cambiarContrasena } = usePerfil();
  const [seccionAbierta, setSeccionAbierta] = useState<'ninguna' | 'editar' | 'contrasena'>('ninguna');

  useEffect(() => {
    cargar();
  }, [cargar]);

  const toggleSeccion = (seccion: 'editar' | 'contrasena') => {
    setSeccionAbierta((prev) => prev === seccion ? 'ninguna' : seccion);
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--s6)', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, borderRadius: 'var(--r-lg)', background: 'var(--surface-hover)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
          <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}'}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--s6)' }}>
        <Alert variant="error" title={t('perfilpage.error_al_cargar_perfil')} description={error.message} />
      </div>
    );
  }

  if (!perfil) return null;

  const iniciales = (perfil.nombre[0] ?? '') + (perfil.apellidos[0] ?? '');

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--s5)' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('perfilpage.mi_perfil')}</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('perfilpage.consulta_y_gestion_de_tu_informacion')}</p>
      </div>

      {/* Hero card */}
      <div style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 'var(--s5)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: 7,
          background: 'linear-gradient(90deg, var(--brand-600) 0%, var(--brand-400) 50%, var(--brand-300) 100%)',
        }} />
        <div style={{ padding: 'var(--s5)', display: 'flex', alignItems: 'center', gap: 'var(--s5)', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-100) 0%, var(--brand-300) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-700)',
              border: '3px solid var(--surface-card)',
              boxShadow: '0 0 0 1px var(--surface-border), var(--shadow-sm)',
            }} aria-hidden>
              {iniciales}
            </div>
            <div style={{
              position: 'absolute', bottom: 3, right: 3, width: 13, height: 13,
              borderRadius: '50%',
              background: perfil.estado_cuenta.toUpperCase() === 'ACTIVO' ? 'var(--sem-success)' : 'var(--sem-warning)',
              border: '2px solid var(--surface-card)',
            }} aria-hidden />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
              {perfil.nombre} {perfil.apellidos}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 'var(--s2)' }}>
              {perfil.correo_electronico}
            </p>
            <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              <Badge variant={perfil.nombre_rol.toLowerCase() as any}>{perfil.nombre_rol}</Badge>
              <Badge variant={perfil.estado_cuenta.toLowerCase() as any}>{perfil.estado_cuenta}</Badge>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => toggleSeccion('editar')}
              aria-pressed={seccionAbierta === 'editar'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 'var(--r-md)',
                border: `1.5px solid ${seccionAbierta === 'editar' ? 'var(--brand-400)' : 'var(--surface-border)'}`,
                background: seccionAbierta === 'editar' ? 'var(--brand-50)' : 'var(--surface-card)',
                color: seccionAbierta === 'editar' ? 'var(--brand-600)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <Edit2 size={13} aria-hidden />{t('perfilpage.editar_perfil')}</button>
            <button
              type="button"
              onClick={() => toggleSeccion('contrasena')}
              aria-pressed={seccionAbierta === 'contrasena'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 'var(--r-md)',
                border: '1.5px solid transparent',
                background: seccionAbierta === 'contrasena' ? 'var(--brand-600)' : 'var(--brand-500)',
                color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              <Lock size={13} aria-hidden />{t('perfilpage.cambiar_contrasena')}</button>
          </div>
        </div>
      </div>

      {/* Info cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s4)', marginBottom: 'var(--s5)' }}>

        {/* Información personal */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
              <User size={13} aria-hidden />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.informacion_personal')}</span>
          </div>
          <div style={{ padding: 'var(--s4)' }}>
            <InfoGrid items={[
              ['Nombres', perfil.nombre],
              ['Apellidos', perfil.apellidos],
              ['Tipo de ID', perfil.tipo_identificacion],
              ['N.° Identificación', mascararId(perfil.numero_identificacion), true],
              ['Fecha de nacimiento', formatFecha(perfil.fecha_nacimiento), true],
              ['Fecha de registro', formatFecha(perfil.fecha_registro), true],
              ['Teléfono', perfil.telefono ?? '—', true],
              ['Dirección', perfil.direccion ?? '—'],
            ]} />
          </div>
        </div>

        {/* Datos de cuenta */}
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--s3) var(--s4)', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--brand-50)', border: '1px solid var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)' }}>
              <Lock size={13} aria-hidden />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.datos_de_cuenta')}</span>
          </div>
          <div style={{ padding: 'var(--s4)' }}>
            <div style={{ paddingBottom: 'var(--s3)', borderBottom: '1px solid var(--surface-border)', marginBottom: 'var(--s3)' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{t('perfilpage.correo_electronico')}</p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{perfil.correo_electronico}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{t('perfilpage.estado_de_cuenta')}</p>
                <Badge variant={perfil.estado_cuenta.toLowerCase() as any}>{perfil.estado_cuenta}</Badge>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{t('perfilpage.rol_asignado')}</p>
                <Badge variant={perfil.nombre_rol.toLowerCase() as any}>{perfil.nombre_rol}</Badge>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{t('perfilpage.ultimo_acceso')}</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatFechaHora(perfil.ultimo_acceso)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel editar datos personales */}
      {seccionAbierta === 'editar' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', marginBottom: 'var(--s5)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
            <Edit2 size={16} color="var(--brand-600)" aria-hidden />
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.editar_datos_personales')}</h2>
          </div>
          <PerfilForm
            perfil={perfil}
            saving={saving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onSave={editar}
          />
        </div>
      )}

      {/* Panel cambiar contraseña */}
      {seccionAbierta === 'contrasena' && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', borderRadius: 'var(--r-xl)', padding: 'var(--s5)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s4)' }}>
            <Lock size={16} color="var(--brand-600)" aria-hidden />
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t('perfilpage.cambiar_contrasena')}</h2>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--s4)' }}>{t('perfilpage.al_cambiar_tu_contrasena_se_cerraran_todas')}</p>
          <CambiarContrasenaForm
            saving={saving}
            pwError={pwError}
            pwSuccess={pwSuccess}
            onSave={cambiarContrasena}
          />
        </div>
      )}
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {items.map(([label, value, mono], i) => (
        <div
          key={label}
          style={{
            padding: 'var(--s3) 0',
            borderBottom: i < items.length - 2 ? '1px solid var(--surface-border)' : 'none',
            paddingRight: i % 2 === 0 ? 'var(--s4)' : 0,
            paddingLeft: i % 2 === 1 ? 'var(--s4)' : 0,
            borderLeft: i % 2 === 1 ? '1px solid var(--surface-border)' : 'none',
          }}
        >
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
            {label}
          </p>
          <p style={{
            fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
