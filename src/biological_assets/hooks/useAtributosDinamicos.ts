import { useCallback, useRef, useState } from 'react';
import { atributosDinamicosApi } from '../api/atributosDinamicosApi';
import type { AtributoDinamicoConfig, TipoActivo } from '../types';
import type { ApiError } from '../../shared/api/errors';

/** Valor crudo de un control del formulario: texto del `<input>` o checkbox. */
export type ValorAtributoForm = string | boolean;

/** Clave de i18n (namespace `biologicalAssets`) con sus parámetros. */
export interface ErrorAtributo {
  clave: string;
  params?: Record<string, unknown>;
}

/** Nombre del control en react-hook-form: el nombre de la métrica puede tener puntos o espacios. */
export function campoAtributo(cfg: AtributoDinamicoConfig): string {
  return `m${cfg.id}`;
}

function aplicaA(cfg: AtributoDinamicoConfig, tipo: TipoActivo): boolean {
  if (cfg.aplica_a_tipo_activo === 'AMBOS') return true;
  return cfg.aplica_a_tipo_activo === (tipo === 'POBLACIONAL' ? 'LOTE' : 'INDIVIDUAL');
}

function esVacio(valor: ValorAtributoForm | undefined): boolean {
  return valor === undefined || (typeof valor === 'string' && valor.trim() === '');
}

/** Espejo de `_validar_atributos_dinamicos` (backend) para avisar en `blur`. */
export function validarAtributo(
  cfg: AtributoDinamicoConfig,
  valor: ValorAtributoForm | undefined,
): ErrorAtributo | null {
  if (cfg.tipo_dato === 'BOOLEANO') return null;
  if (esVacio(valor)) {
    return cfg.es_obligatorio ? { clave: 'atributosdinamicos.obligatorio' } : null;
  }
  if (cfg.tipo_dato === 'TEXTO') return null;

  const texto = String(valor).trim();
  const numero = Number(texto);
  if (!Number.isFinite(numero)) return { clave: 'atributosdinamicos.debe_ser_numerico' };
  if (cfg.tipo_dato === 'ENTERO' && !Number.isInteger(numero)) {
    return { clave: 'atributosdinamicos.debe_ser_entero' };
  }
  if (cfg.valor_min !== null && numero < cfg.valor_min) {
    return { clave: 'atributosdinamicos.minimo', params: { min: cfg.valor_min } };
  }
  if (cfg.valor_max !== null && numero > cfg.valor_max) {
    return { clave: 'atributosdinamicos.maximo', params: { max: cfg.valor_max } };
  }
  return null;
}

/**
 * Convierte los valores del formulario al payload `atributos_dinamicos`,
 * con el tipo JSON que exige el backend (número, entero, texto o booleano).
 * Los opcionales vacíos se omiten; sin atributos el payload es `null`.
 */
export function construirAtributos(
  config: AtributoDinamicoConfig[],
  valores: Record<string, ValorAtributoForm> | undefined,
): Record<string, unknown> | null {
  const salida: Record<string, unknown> = {};
  for (const cfg of config) {
    const valor = valores?.[campoAtributo(cfg)];
    if (cfg.tipo_dato === 'BOOLEANO') {
      salida[cfg.nombre] = valor === true;
      continue;
    }
    if (esVacio(valor)) continue;
    const texto = String(valor).trim();
    salida[cfg.nombre] = cfg.tipo_dato === 'TEXTO' ? texto : Number(texto);
  }
  return Object.keys(salida).length > 0 ? salida : null;
}

/**
 * Configuración de atributos dinámicos según especie y tipo de activo (RF-33).
 * Si la configuración no se puede leer (sin permiso, sin red) el formulario
 * sigue siendo usable: el backend vuelve a validar al registrar.
 */
export function useAtributosDinamicos() {
  const [config, setConfig] = useState<AtributoDinamicoConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Descarta respuestas de una especie anterior si el usuario cambió el ID entre tanto.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async (idEspecie: number | null, tipo: TipoActivo) => {
    const peticion = ++ultimaPeticion.current;
    setError(null);
    if (!idEspecie || idEspecie < 1) {
      setConfig([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await atributosDinamicosApi.listarPorEspecie(idEspecie);
      if (peticion !== ultimaPeticion.current) return;
      setConfig(data.filter((cfg) => aplicaA(cfg, tipo)));
    } catch (e) {
      if (peticion !== ultimaPeticion.current) return;
      setConfig([]);
      setError(e as ApiError);
    } finally {
      if (peticion === ultimaPeticion.current) setLoading(false);
    }
  }, []);

  return { config, loading, error, cargar };
}
