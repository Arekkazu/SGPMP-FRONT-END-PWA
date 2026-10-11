import React, { useState } from 'react';
import { useT } from '../../shared/i18n/useT';
import { Search } from 'lucide-react';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Button } from '../../shared/design-system/Button';
import { UsuarioCombobox, idDeUsuario } from '../../usuarios/components/UsuarioCombobox';
import type { FiltrosAuditoria, TipoEvento } from '../types';


interface Props {
  onBuscar: (filtros: Partial<FiltrosAuditoria>) => void;
  onReset: () => void;
  // Viene de `GET /auditoria/catalogo/tipos-evento`. Mantener esta lista a mano
  // ya provocó que las 25 etiquetas apuntaran al evento equivocado.
  tiposEvento: TipoEvento[];
}

export function AuditoriaFiltros({ onBuscar, onReset, tiposEvento }: Props) {
  const { t } = useT('auditoria');
  // Usuario por nombre, correo o ID (antes solo un campo numérico de ID).
  const [usuario, setUsuario] = useState('');
  const [usuarioError, setUsuarioError] = useState<string>();
  const [tipoEvento, setTipoEvento] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const buscar = () => {
    const idUsuario = idDeUsuario(usuario);
    if (idUsuario === null) {
      setUsuarioError(t('auditoriafiltros.usuario_no_encontrado'));
      return;
    }
    onBuscar({
      id_usuario: idUsuario,
      tipo_evento: tipoEvento ? parseInt(tipoEvento, 10) : undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
    });
  };

  const limpiar = () => {
    setUsuario('');
    setUsuarioError(undefined);
    setTipoEvento('');
    setFechaDesde('');
    setFechaHasta('');
    onReset();
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); buscar(); }}
      style={{ display: 'flex', gap: 'var(--s3)', flexWrap: 'wrap', marginBottom: 'var(--s5)', alignItems: 'flex-end' }}
    >
      <div style={{ flex: '1 1 220px' }}>
        <UsuarioCombobox
          id="auditoria-usuario"
          label={t('auditoriafiltros.usuario')}
          value={usuario}
          onChange={(v) => { setUsuario(v); setUsuarioError(undefined); }}
          hint={t('auditoriafiltros.usuario_hint')}
          error={usuarioError}
        />
      </div>
      <div style={{ flex: '1 1 180px' }}>
        <Select
          label={t('auditoriafiltros.tipo_de_evento')}
          value={tipoEvento}
          onChange={(e) => setTipoEvento(e.target.value)}
          // QA TC-DIS-29: Enter sobre el selector dispara la búsqueda, igual
          // que en el resto del formulario.
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
        >
          <option value="">{t('auditoriafiltros.todos_los_tipos')}</option>
          {tiposEvento.map((t) => (
            <option key={t.id_tipo_evento} value={String(t.id_tipo_evento)}>{t.nombre}</option>
          ))}
        </Select>
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label={t('auditoriafiltros.fecha_desde')}
          type="datetime-local"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
      </div>
      <div style={{ flex: '1 1 160px' }}>
        <Input
          label={t('auditoriafiltros.fecha_hasta')}
          type="datetime-local"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--s2)' }}>
        <Button type="submit" variant="primary" size="md">
          <Search size={16} aria-hidden style={{ marginRight: 'var(--s1)' }} />{t('auditoriafiltros.buscar')}</Button>
        <Button type="button" variant="secondary" size="md" onClick={limpiar}>{t('auditoriafiltros.limpiar')}</Button>
      </div>
    </form>
  );
}
