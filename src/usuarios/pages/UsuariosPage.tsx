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
import { Select } from '../../shared/design-system/Select';

type ModalState =
  | { tipo: 'ninguno' }
  | { tipo: 'detalle'; idUsuario: number }
  | { tipo: 'gestionar'; idUsuario: number; nombre: string; estadoActual: string };

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

  const estadoOptions = [
    { value: '', label: t('usuariospage.todos_los_estados') },
    { value: '1', label: t('estados.activo', { ns: 'common' }) },
    { value: '2', label: t('estados.inactivo', { ns: 'common' }) },
    { value: '3', label: t('estados.bloqueado', { ns: 'common' }) },
    { value: '4', label: t('estados.pendiente', { ns: 'common' }) },
    { value: '5', label: t('estados.eliminado', { ns: 'common' }) },
  ];

  const rolOptions = [
    { value: '', label: t('usuariospage.todos_los_roles') },
    { value: '1', label: t('usuariospage.roles_admin') },
    { value: '2', label: t('usuariospage.roles_productor') },
    { value: '3', label: t('usuariospage.roles_veterinario') },
    { value: '4', label: t('usuariospage.roles_contador') },
    { value: '5', label: t('usuariospage.roles_ingeniero') },
  ];

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
          <h1 style={{ fontSize: 'var(--fs-heading-md)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{t('usuariospage.usuarios')}</h1>
          <p style={{ fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)' }}>
            {loading ? t('estados.cargando', { ns: 'common' }) : t('usuariospage.usuarios_count', { count: total })}
            {fromCache && ` · ${t('usuariospage.datos_desde_cache')}`}
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
          <Select
            label={t('usuariospage.rol')}
            value={busquedaRol}
            onChange={(e) => setBusquedaRol(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
          >
            {rolOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ flex: '0 1 150px' }}>
          <Select
            label={t('usuariospage.estado')}
            value={busquedaEstado}
            onChange={(e) => setBusquedaEstado(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
          >
            {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
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
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--fs-label-md)', color: 'var(--text-secondary)' }}>
            {t('usuariospage.pagina_x_de_y', { pagina: filtros.pagina, total: totalPages })}
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
