import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useT } from '../i18n/useT';
import { normalizar } from '../hooks/useBusqueda';
import './Input.css';
import './Combobox.css';

export interface OpcionCombobox {
  /** Texto que queda escrito en el campo al elegir la opción. */
  valor: string;
  /** Línea secundaria, solo informativa. */
  detalle?: string;
}

interface ComboboxProps {
  id: string;
  label: string;
  opciones: OpcionCombobox[];
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
}

/**
 * Lista desplegable con escritura libre (patrón combobox de ARIA 1.2): la
 * flecha muestra todas las opciones y escribir las filtra, sin tildes ni
 * mayúsculas. El texto escrito se conserva tal cual, así quien lo consume
 * puede aceptar también valores fuera de la lista (ej. un ID).
 */
export function Combobox({
  id, label, opciones, value, onChange, onBlur, inputRef, name,
  required, disabled, placeholder, hint, error,
}: ComboboxProps) {
  const { t } = useT('common');
  const input = useRef<HTMLInputElement | null>(null);
  const [abierto, setAbierto] = useState(false);
  // Filtra solo lo escrito; al abrir con la flecha se ven todas las opciones.
  const [filtrar, setFiltrar] = useState(false);
  const [activo, setActivo] = useState(-1);

  const listaId = `${id}-lista`;
  const opcionId = (i: number) => `${id}-op-${i}`;
  const q = filtrar ? normalizar(value ?? '') : '';
  const visibles = q ? opciones.filter((o) => normalizar(`${o.valor} ${o.detalle ?? ''}`).includes(q)) : opciones;
  const mostrar = abierto && !disabled;

  useEffect(() => {
    if (mostrar && activo >= 0) document.getElementById(opcionId(activo))?.scrollIntoView?.({ block: 'nearest' });
  }, [mostrar, activo]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (todas: boolean) => {
    if (todas) setFiltrar(false);
    setAbierto(true);
  };
  const cerrar = () => { setAbierto(false); setActivo(-1); };
  const elegir = (o: OpcionCombobox) => {
    onChange(o.valor);
    setFiltrar(false);
    cerrar();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = visibles.length;
      if (!abierto) abrir(false);
      if (!n) return;
      setActivo((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i <= 0 ? n - 1 : i - 1)));
    } else if (e.key === 'Enter' && mostrar && visibles[activo]) {
      e.preventDefault();
      elegir(visibles[activo]);
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault();
      cerrar();
    }
  };

  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={id}>
        {label}
        {required && <span className="ds-field__req" aria-hidden="true"> *</span>}
      </label>
      <div className="ds-field__wrap">
        <input
          ref={(el) => { input.current = el; inputRef?.(el); }}
          id={id}
          name={name}
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={mostrar && activo >= 0 ? opcionId(activo) : undefined}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={[error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined}
          autoComplete="off"
          className={['ds-field__input', 'ds-combobox__input', error ? 'ds-field__input--err' : ''].filter(Boolean).join(' ')}
          value={value ?? ''}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => { onChange(e.target.value); setFiltrar(true); setActivo(-1); abrir(false); }}
          onKeyDown={onKeyDown}
          onBlur={() => { cerrar(); onBlur?.(); }}
        />
        <button
          type="button"
          tabIndex={-1}
          className="ds-combobox__toggle"
          aria-label={t('combobox.mostrar_opciones', { campo: label })}
          disabled={disabled}
          // Sin esto el campo pierde el foco y la lista se cierra antes del clic.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (abierto) cerrar();
            else { abrir(true); input.current?.focus(); }
          }}
        >
          <ChevronDown size={20} strokeWidth={1.5} aria-hidden />
        </button>
        {mostrar && (
          <ul id={listaId} role="listbox" aria-label={label} className="ds-combobox__lista">
            {visibles.length === 0 ? (
              <li role="presentation" className="ds-combobox__vacio">{t('combobox.sin_coincidencias')}</li>
            ) : (
              visibles.map((o, i) => (
                <li
                  key={o.valor}
                  id={opcionId(i)}
                  role="option"
                  aria-selected={i === activo}
                  className={`ds-combobox__opcion${i === activo ? ' ds-combobox__opcion--activa' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(o)}
                >
                  <span>{o.valor}</span>
                  {o.detalle && <span className="ds-combobox__detalle">{o.detalle}</span>}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error && <span id={`${id}-err`} className="ds-field__error" role="alert">{error}</span>}
      {hint && !error && <span id={`${id}-hint`} className="ds-field__hint">{hint}</span>}
    </div>
  );
}
