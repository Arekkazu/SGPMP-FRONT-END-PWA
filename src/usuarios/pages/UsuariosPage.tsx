import React, { useEffect, useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search, RefreshCw } from 'lucide-react';
import { useUsuarios } from '../hooks/useUsuarios';
import { usePermission } from '../../shared/rbac/usePermission';
import { useOnlineStatus } from '../../shared/hooks/useOnlineStatus';
import { UsuariosTable } from '../components/UsuariosTable';
import { UsuarioModal } from '../components/UsuarioModal';
import { GestionarModal } from '../components/GestionarModal';
import { Alert } from '../../shared/design-system/Alert';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'detalle'; idUsuario: number }
  | { tipo: 'gestionar'; idUsuario: number; nombre: string; estadoActual: string };

const SELECT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 var(--s3)',
  borderRadius: 'var(--r-md)',
  border: '1.5px solid var(--surface-border)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  cursor: 'pointer',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 'var(--s1)',
};

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: '1', label: 'Activo' },
  { value: '2', label: 'Inactivo' },
  { value: '3', label: 'Bloqueado' },
  { value: '4', label: 'Pendiente' },
  { value: '5', label: 'Eliminado' },
];

const ROL_OPTIONS = [
  { value: '', label: 'Todos los roles' },
  { value: '1', label: 'Administrador' },
  { value: '2', label: 'Productor' },
  { value: '3', label: 'Veterinario' },
  { value: '4', label: 'Contador' },
  { value: '5', label: 'Ingeniero Agrónomo' },
];

export function UsuariosPage() {
  const { t } = useT('usuarios');
  const puedeVer = usePermission(1, 2);
  const puedeGestionar = usePermission(4, 3);
  const puedeEditar = usePermission(1, 3);
  const online = useOnlineStatus();
  const { usuarios, total, loading, error, filtros, fromCache, cargar, actualizarFiltros } = useUsuarios();
  const [modal, setModal] = useState<ModalState>({ tipo: 'ninguno' });
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [busquedaCorreo, setBusquedaCorreo] = useState('');
  const [busquedaRol, setBusquedaRol] = useState('');
  const [busquedaEstado, setBusquedaEstado] = useState('');

  useEffect(() => {
    if (puedeVer) cargar();
  }, [puedeVer, cargar]);

  if (!puedeVer) {
    return (
      <div style={{ padding: 'var(--s7)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t('usuariospage.no_tienes_permiso_para_ver_esta_seccion')}</p>
      </div>
    );
  }

  const buscar = () => actualizarFiltros({
    nombre: busquedaNombre || undefined,
    correo: busquedaCorreo || undefined,
    id_rol: busquedaRol ? parseInt(busquedaRol, 10) : undefined,
    id_estado: busquedaEstado ? parseInt(busquedaEstado, 10) : undefined,
  });

  const handleVerDetalle = (idUsuario: number) => {
    setModal({ tipo: 'detalle', idUsuario });
  };

  const handleGestionar = (idUsuario: number, estadoActual: string) => {
    const u = usuarios.find((x) => x.id_usuario === idUsuario);
    if (!u) return;
    setModal({ tipo: 'gestionar', idUsuario, nombre: u.nombre_usuario, estadoActual });
  };

  const cerrarModal = () => setModal({ tipo: 'ninguno' });

  const totalPages = Math.ceil(total / filtros.tamano);

  return (
    <div style={{ padding: 'var(--s6)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('usuariospage.usuarios')}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {loading ? 'Cargando…' : `${total} usuario${total !== 1 ? 's' : ''}`}
            {fromCache && ' · datos desde caché'}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => cargar()} aria-label={t('usuariospage.recargar')}>
          <RefreshCw size={16} aria-hidden />
        </Button>
      </div>

      {!online && (
        <Alert
          variant="warning"
          title={t('usuariospage.sin_conexion')}
          description={t('usuariospage.mostrando_datos_cacheados_las_acciones_de')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {fromCache && online && (
        <Alert
          variant="info"
          title={t('usuariospage.datos_desde_cache')}
          description={t('usuariospage.no_se_pudo_conectar_con_el_servidor_se')}
          style={{ marginBottom: 'var(--s4)' }}
        />
      )}

      {error && !fromCache && (
        <Alert variant="error" title={t('usuariospage.error_al_cargar_usuarios')} description={error.message} style={{ marginBottom: 'var(--s4)' }} />
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--s3)', marginBottom: 'var(--s5)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <Input
            label={t('usuariospage.nombre')}
            placeholder={t('usuariospage.buscar_por_nombre')}
            value={busquedaNombre}
            onChange={(e) => setBusquedaNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <Input
            label={t('usuariospage.correo')}
            type="email"
            placeholder={t('usuariospage.buscar_por_correo')}
            value={busquedaCorreo}
            onChange={(e) => setBusquedaCorreo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <label style={LABEL_STYLE}>{t('usuariospage.rol')}</label>
          <select value={busquedaRol} onChange={(e) => setBusquedaRol(e.target.value)} style={SELECT_STYLE}>
            {ROL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <label style={LABEL_STYLE}>{t('usuariospage.estado')}</label>
          <select value={busquedaEstado} onChange={(e) => setBusquedaEstado(e.target.value)} style={SELECT_STYLE}>
            {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Button variant="primary" size="md" onClick={buscar}>
            <Search size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('usuariospage.buscar')}</Button>
        </div>
      </div>

      <UsuariosTable
        usuarios={usuarios}
        loading={loading}
        onVerDetalle={handleVerDetalle}
        onGestionar={handleGestionar}
        puedeGestionar={puedeGestionar && online}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--s2)', marginTop: 'var(--s5)' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina <= 1}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina - 1 })}
          >{t('usuariospage.anterior')}</Button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Página {filtros.pagina} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={filtros.pagina >= totalPages}
            onClick={() => actualizarFiltros({ pagina: filtros.pagina + 1 })}
          >{t('usuariospage.siguiente')}</Button>
        </div>
      )}

      {modal.tipo === 'detalle' && (
        <UsuarioModal
          idUsuario={modal.idUsuario}
          onClose={cerrarModal}
          onSaved={() => { cerrarModal(); cargar(); }}
          puedeEditar={puedeEditar && online}
        />
      )}

      {modal.tipo === 'gestionar' && (
        <GestionarModal
          idUsuario={modal.idUsuario}
          nombreUsuario={modal.nombre}
          estadoActual={modal.estadoActual}
          onClose={cerrarModal}
          onDone={() => { cerrarModal(); cargar(); }}
        />
      )}
    </div>
  );
}
