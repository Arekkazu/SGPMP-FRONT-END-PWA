/**
 * Validación cruzada de umbrales ambientales (RF-17), espejo exacto de
 * `_validar_rangos` en `registrar_umbral_use_case.py` del backend — mismo criterio
 * de contigüidad/cobertura y de rango físico, para rechazar en el cliente lo que el
 * backend rechazaría igual, sin el viaje de red.
 */
import type { NivelAlertaDTO, UmbralAmbientalResponse, VariableAmbientalCatalogo } from '../types';

export interface ValidacionUmbral {
  campo: 'valor_min' | 'valor_max' | 'niveles' | 'id_variable_ambiental';
  mensaje: string;
}

/** FA-04: los valores generales deben caer dentro del rango físico de la variable. */
function validarRangoFisico(
  valorMin: number,
  valorMax: number,
  variable: VariableAmbientalCatalogo
): ValidacionUmbral | null {
  if (valorMin < variable.valor_fisico_min || valorMax > variable.valor_fisico_max) {
    return {
      campo: 'valor_min',
      mensaje:
        `Los valores deben estar dentro del rango físico permitido para ` +
        `"${variable.nombre}": [${variable.valor_fisico_min}, ${variable.valor_fisico_max}] ${variable.unidad}.`,
    };
  }
  return null;
}

/** FA-08 + FA-05: cada nivel dentro de rango, y los tres contiguos sin huecos ni solapes. */
function validarNivelesContiguos(
  valorMin: number,
  valorMax: number,
  niveles: NivelAlertaDTO[]
): ValidacionUmbral | null {
  for (const n of niveles) {
    if (n.limite_inferior < valorMin || n.limite_superior > valorMax) {
      return {
        campo: 'niveles',
        mensaje: `El nivel "${n.nivel}" (${n.limite_inferior}–${n.limite_superior}) cae fuera del rango general [${valorMin}, ${valorMax}].`,
      };
    }
  }

  const ordenados = [...niveles].sort((a, b) => a.limite_inferior - b.limite_inferior);

  if (ordenados[0].limite_inferior !== valorMin) {
    return {
      campo: 'niveles',
      mensaje: `El primer nivel debe comenzar en ${valorMin} (el mínimo del umbral). Actualmente comienza en ${ordenados[0].limite_inferior}.`,
    };
  }
  const ultimo = ordenados[ordenados.length - 1];
  if (ultimo.limite_superior !== valorMax) {
    return {
      campo: 'niveles',
      mensaje: `El último nivel debe terminar en ${valorMax} (el máximo del umbral). Actualmente termina en ${ultimo.limite_superior}.`,
    };
  }
  for (let i = 0; i < ordenados.length - 1; i++) {
    if (ordenados[i].limite_superior !== ordenados[i + 1].limite_inferior) {
      return {
        campo: 'niveles',
        mensaje:
          `Los niveles de alerta deben ser contiguos sin huecos ni solapamientos. ` +
          `El nivel "${ordenados[i].nivel}" termina en ${ordenados[i].limite_superior} ` +
          `pero el siguiente comienza en ${ordenados[i + 1].limite_inferior}.`,
      };
    }
  }
  return null;
}

/** FA-02: un umbral activo por combinación (especie, variable) — UX proactiva, el backend sigue siendo la autoridad (409). */
function validarNoDuplicado(
  idVariableAmbiental: number,
  umbralesExistentes: UmbralAmbientalResponse[]
): ValidacionUmbral | null {
  const yaExiste = umbralesExistentes.some(
    (u) => u.es_activo && u.id_variable_ambiental === idVariableAmbiental
  );
  if (yaExiste) {
    return {
      campo: 'id_variable_ambiental',
      mensaje: 'Ya existe un umbral activo para esta variable en esta especie. Edite la configuración existente.',
    };
  }
  return null;
}

/**
 * Valida un umbral antes de enviarlo. `umbralesExistentes` y la verificación de
 * duplicado solo aplican al crear (en editar, pasar `[]`: el umbral que se edita ya
 * está en la lista y no debe chocar consigo mismo).
 */
export function validarUmbral(params: {
  valorMin: number;
  valorMax: number;
  niveles: NivelAlertaDTO[];
  variable: VariableAmbientalCatalogo | undefined;
  idVariableAmbiental: number;
  umbralesExistentes: UmbralAmbientalResponse[];
}): ValidacionUmbral | null {
  const { valorMin, valorMax, niveles, variable, idVariableAmbiental, umbralesExistentes } = params;

  const duplicado = validarNoDuplicado(idVariableAmbiental, umbralesExistentes);
  if (duplicado) return duplicado;

  if (variable) {
    const rangoFisico = validarRangoFisico(valorMin, valorMax, variable);
    if (rangoFisico) return rangoFisico;
  }

  return validarNivelesContiguos(valorMin, valorMax, niveles);
}
