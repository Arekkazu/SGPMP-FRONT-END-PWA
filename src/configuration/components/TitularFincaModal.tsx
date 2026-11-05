// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-04 | Arekkazu | RF-19 v1.1: titular tributario de la finca (M06 cierra por titular) |
import React, { useEffect, useState } from 'react';
import { ModalShell } from '../../shared/design-system/ModalShell';
import { Button } from '../../shared/design-system/Button';
import { Input } from '../../shared/design-system/Input';
import { Select } from '../../shared/design-system/Select';
import { Alert } from '../../shared/design-system/Alert';
import { pushToast } from '../../shared/hooks/useToast';
import { useT } from '../../shared/i18n/useT';
import type { ApiError } from '../../shared/api/errors';
import { fincasApi } from '../api/fincasApi';
import type { FincaResponse, TitularFinca } from '../types';

const PESOS_DIAN = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Dígito de verificación del NIT (DIAN). Solo sugiere: el backend es quien valida. */
export function digitoVerificacion(nit: string): string {
  const suma = [...nit].reverse().reduce((acc, d, i) => acc + Number(d) * PESOS_DIAN[i], 0);
  const residuo = suma % 11;
  return String(residuo > 1 ? 11 - residuo : residuo);
}

interface Props { finca: FincaResponse; puedeEditar: boolean; onCerrar: () => void }

export function TitularFincaModal({ finca, puedeEditar, onCerrar }: Props) {
  const { t } = useT('configuration');
  const [actual, setActual] = useState<TitularFinca | null>(null);
  const [tipo, setTipo] = useState<'' | 'NIT' | 'CC' | 'CE'>('');
  const [numero, setNumero] = useState('');
  const [dv, setDv] = useState('');
  const [razon, setRazon] = useState('');
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fincasApi.titular(finca.id_finca).then((r) => {
      setActual(r);
      setTipo(r.tipo_id_tributaria ?? '');
      setNumero(r.numero_id_tributaria ?? '');
      setDv(r.dv ?? '');
      setRazon(r.razon_social ?? '');
    }).catch((e: ApiError) => setError(e.message));
  }, [finca.id_finca]);

  const cambiarNumero = (valor: string) => {
    const limpio = valor.replace(/\D/g, '').slice(0, 15);
    setNumero(limpio);
    if (tipo === 'NIT' && limpio.length >= 6) setDv(digitoVerificacion(limpio));
  };

  const guardar = async (quitar = false) => {
    if (!quitar) {
      if (!tipo) { setError(t('titular.tipo_requerido')); return; }
      if (!/^\d{6,15}$/.test(numero)) { setError(t('titular.numero_invalido')); return; }
      if (tipo === 'NIT' && dv !== digitoVerificacion(numero)) { setError(t('titular.dv_invalido')); return; }
      if (!razon.trim()) { setError(t('titular.razon_requerida')); return; }
    }
    setError(undefined);
    setGuardando(true);
    try {
      await fincasApi.asignarTitular(finca.id_finca, quitar
        ? { tipo_id_tributaria: null, numero_id_tributaria: null, dv: null, razon_social: null }
        : { tipo_id_tributaria: tipo as 'NIT' | 'CC' | 'CE', numero_id_tributaria: numero, dv: tipo === 'NIT' ? dv : null, razon_social: razon.trim() });
      pushToast('success', quitar ? t('titular.quitado') : t('titular.guardado'));
      onCerrar();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalShell
      title={t('titular.titulo', { finca: finca.nombre })}
      onClose={onCerrar}
      maxWidth={520}
      footer={(
        <>
          <Button variant="secondary" size="md" onClick={onCerrar} disabled={guardando}>{t('titular.cancelar')}</Button>
          {puedeEditar && actual?.tipo_id_tributaria && (
            <Button variant="danger" size="md" onClick={() => guardar(true)} disabled={guardando}>{t('titular.quitar')}</Button>
          )}
          {puedeEditar && <Button variant="primary" size="md" loading={guardando} onClick={() => guardar()}>{t('titular.guardar')}</Button>}
        </>
      )}
    >
      <p style={{ margin: '0 0 var(--s4)', fontSize: 'var(--fs-body-md)', color: 'var(--text-secondary)', lineHeight: 'var(--lh-base)' }}>{t('titular.ayuda')}</p>
      {error && <Alert variant="error" title={error} style={{ marginBottom: 'var(--s4)' }} />}
      {actual && (
        <div style={{ display: 'grid', gap: 'var(--s4)' }}>
          <Select id="titular-tipo" label={t('titular.tipo')} required value={tipo} disabled={!puedeEditar}
            onChange={(e) => { setTipo(e.target.value as '' | 'NIT' | 'CC' | 'CE'); if (e.target.value === 'NIT' && numero.length >= 6) setDv(digitoVerificacion(numero)); }}>
            <option value="">{t('titular.sin_titular')}</option>
            <option value="NIT">NIT</option>
            <option value="CC">{t('titular.cc')}</option>
            <option value="CE">{t('titular.ce')}</option>
          </Select>
          <div style={{ display: 'grid', gridTemplateColumns: tipo === 'NIT' ? '1fr 96px' : '1fr', gap: 'var(--s3)' }}>
            <Input id="titular-numero" label={t('titular.numero')} required inputMode="numeric" value={numero} disabled={!puedeEditar}
              onChange={(e) => cambiarNumero(e.target.value)} hint={t('titular.numero_ayuda')} />
            {tipo === 'NIT' && (
              <Input id="titular-dv" label={t('titular.dv')} required inputMode="numeric" maxLength={1} value={dv} disabled={!puedeEditar}
                onChange={(e) => setDv(e.target.value.replace(/\D/g, ''))} />
            )}
          </div>
          <Input id="titular-razon" label={t('titular.razon_social')} required maxLength={120} value={razon} disabled={!puedeEditar}
            onChange={(e) => setRazon(e.target.value)} />
        </div>
      )}
    </ModalShell>
  );
}
