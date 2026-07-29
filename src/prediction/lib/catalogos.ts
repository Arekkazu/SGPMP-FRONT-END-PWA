// =====================================================================
// Catálogos auxiliares del módulo (RF-64).
// ⚠️ El backend de M04 no expone endpoints para el catálogo de variables
// sensóricas (I3P-1) ni para las especies (M09). Se usan listas estáticas
// como stop-gap; ver do-it/prediction/TASKS.md § Pendientes.
// =====================================================================

export interface VariableSensorica {
  id: number;
  nombre: string;
  unidad: string;
}

/** Catálogo I3P-1 (estático). El id debe alinearse con el catálogo real del backend. */
export const CATALOGO_VARIABLES: VariableSensorica[] = [
  { id: 1, nombre: 'Temperatura ambiente', unidad: '°C' },
  { id: 2, nombre: 'Humedad relativa', unidad: '%' },
  { id: 3, nombre: 'Amoníaco (NH₃)', unidad: 'ppm' },
  { id: 4, nombre: 'Dióxido de carbono (CO₂)', unidad: 'ppm' },
  { id: 5, nombre: 'Luminosidad', unidad: 'lux' },
  { id: 6, nombre: 'Ruido ambiental', unidad: 'dB' },
  { id: 7, nombre: 'Velocidad del aire', unidad: 'm/s' },
  { id: 8, nombre: 'Índice THI', unidad: '' },
  { id: 9, nombre: 'Oxígeno disuelto', unidad: 'mg/L' },
  { id: 10, nombre: 'pH del agua', unidad: '' },
  { id: 11, nombre: 'Turbidez', unidad: 'NTU' },
  { id: 12, nombre: 'Densidad de población', unidad: 'ind/m²' },
];

const VARIABLE_POR_ID = new Map(CATALOGO_VARIABLES.map((v) => [v.id, v]));

export function nombreVariable(id: number): string {
  return VARIABLE_POR_ID.get(id)?.nombre ?? `Variable ${id}`;
}

export interface EspecieOpcion {
  valor: string; // "TODAS" o id_especie como string
  nombre: string;
}

/** Especies aplicables (estático). "TODAS" es siempre válido y seguro para el POST. */
export const CATALOGO_ESPECIES: EspecieOpcion[] = [
  { valor: 'TODAS', nombre: 'Todas las especies' },
  { valor: '1', nombre: 'Bovinos' },
  { valor: '2', nombre: 'Porcinos' },
  { valor: '3', nombre: 'Tilapia roja' },
  { valor: '4', nombre: 'Trucha arcoíris' },
  { valor: '5', nombre: 'Pollos de engorde' },
];

export function nombreEspecie(valor: string): string {
  return CATALOGO_ESPECIES.find((e) => e.valor === valor)?.nombre ?? valor;
}
