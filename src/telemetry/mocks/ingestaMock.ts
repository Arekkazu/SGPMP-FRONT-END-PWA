// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-21 | Arekkazu | PROTO-V2 RF-53: tipo de dato, fases de validación y prioridad E15 (RFC-011/RFC-016) |
// Datos simulados RF-53 (Monitor de ingesta) — flujo AIOT sin endpoint humano.
// Reemplazar por `api/` cuando el backend exponga la lectura de ingesta.
import type { TipoDato } from '../components/TipoDatoPill';
import type { VectorComportamiento } from '../components/VectorComportamientoPanel';

export type EstadoIngesta =
  | 'LECTURA_VALIDA' | 'FUERA_DE_RANGO' | 'ERROR_CALIBRACION' | 'ERROR_AUTENTICACION' | 'ERROR_DUPLICADO'
  | 'ERROR_ESTRUCTURA' | 'ERROR_TIEMPO' | 'ERROR_UNIDAD' | 'ERROR_SENSOR';

export type OrigenIngesta = 'TIEMPO_REAL' | 'BUFFER_LOCAL' | 'EDGE_AGREGADO';
export type FaseEstado = 'done' | 'error' | 'skip';

/** Fases 1–7 de RF-53, en el orden en que se evalúan. */
export const FASES_INGESTA = ['estructura', 'autenticacion', 'temporal', 'clasificacion', 'calidad_rango', 'duplicados', 'calibracion'] as const;

/** Solo estos se persisten en la base principal (Fase 9); el resto va únicamente a bitácora. */
export const ESTADOS_PERSISTIDOS: EstadoIngesta[] = ['LECTURA_VALIDA', 'FUERA_DE_RANGO', 'ERROR_CALIBRACION'];

export interface LecturaIngestaMock {
  id: string;
  sensor: string;
  dispositivo: string;
  tipoDato: TipoDato;
  variable: string;
  categoria: string;
  valor: number | null;
  valorAjustado: number | null;
  unidad: string;
  origen: OrigenIngesta;
  estado: EstadoIngesta;
  capturado: string;
  enviado: string;
  procesado: string;
  latenciaMs: number | null;
  bateria: number | null;
  senal: string;
  calibrado: boolean;
  agregado: boolean;
  latenciaAlta: boolean;
  frecAnomala: boolean;
  drift: boolean;
  /** Insumos de la prioridad compuesta E15 (RFC-016); null = no resuelto. */
  area: string | null;
  areaCriticidad: 'ALTA' | 'MEDIA' | 'BAJA' | null;
  severidad: 'CRITICO' | 'PRECAUCION' | 'NORMAL' | null;
  fases: FaseEstado[];
  vision?: VectorComportamiento;
}

export const INGESTA_KPIS = { hoy: 247, validas: 198, fueraRango: 31, errores: 18 };

type Flags = Pick<LecturaIngestaMock, 'calibrado' | 'agregado' | 'latenciaAlta' | 'frecAnomala' | 'drift'>;
type Base = Omit<LecturaIngestaMock, keyof Flags>;
const SIN_FLAGS: Flags = { calibrado: false, agregado: false, latenciaAlta: false, frecAnomala: false, drift: false };
const lectura = (b: Base, flags: Partial<Flags> = {}): LecturaIngestaMock => ({ ...b, ...SIN_FLAGS, ...flags });

const D = '2026-04-03 ';
const GALPON_A = { area: 'Galpón A · área 4', areaCriticidad: 'MEDIA' as const };
const OK7: FaseEstado[] = ['done', 'done', 'done', 'done', 'done', 'done', 'done'];

export const INGESTA_LECTURAS: LecturaIngestaMock[] = [
  lectura({ id: 'LEC-001', sensor: 'Sensor Ambiental A-01', dispositivo: 'EDGE-GRANJA-001', tipoDato: 'ESCALAR', variable: 'Temperatura Ambiental', categoria: 'Ambiental', valor: 28.4, valorAjustado: 28.2, unidad: '°C', origen: 'TIEMPO_REAL', estado: 'LECTURA_VALIDA', capturado: D + '09:14:22', enviado: D + '09:14:23', procesado: D + '09:14:23', latenciaMs: 420, bateria: 87, senal: '-78 dBm', ...GALPON_A, severidad: 'NORMAL', fases: OK7 }, { calibrado: true }),
  lectura({ id: 'LEC-002', sensor: 'Sensor Hídrico H-03', dispositivo: 'EDGE-ESTANQUE-002', tipoDato: 'ESCALAR', variable: 'pH del Agua', categoria: 'Hídrica', valor: 9.1, valorAjustado: 9.1, unidad: 'pH', origen: 'TIEMPO_REAL', estado: 'FUERA_DE_RANGO', capturado: D + '09:12:05', enviado: D + '09:12:06', procesado: D + '09:12:06', latenciaMs: 380, bateria: 64, senal: '-82 dBm', area: 'Estanque 2 · área 9', areaCriticidad: 'ALTA', severidad: 'PRECAUCION', fases: ['done', 'done', 'done', 'done', 'error', 'done', 'done'] }, { calibrado: true, drift: true }),
  lectura({ id: 'LEC-003', sensor: 'Sensor Biométrico B-07', dispositivo: 'EDGE-GALPONA-003', tipoDato: 'ESCALAR', variable: 'Frecuencia Respiratoria', categoria: 'Animal', valor: 44, valorAjustado: 43.2, unidad: 'rpm', origen: 'BUFFER_LOCAL', estado: 'LECTURA_VALIDA', capturado: D + '08:55:10', enviado: D + '09:10:44', procesado: D + '09:10:45', latenciaMs: 895, bateria: 42, senal: '-91 dBm', ...GALPON_A, severidad: 'NORMAL', fases: OK7 }, { calibrado: true, agregado: true, latenciaAlta: true }),
  lectura({ id: 'LEC-004', sensor: 'Sensor Gas G-02', dispositivo: 'EDGE-GRANJA-001', tipoDato: 'ESCALAR', variable: 'Concentración NH3', categoria: 'Ambiental', valor: 0, valorAjustado: null, unidad: 'ppm', origen: 'TIEMPO_REAL', estado: 'ERROR_CALIBRACION', capturado: D + '09:08:33', enviado: D + '09:08:34', procesado: D + '09:08:34', latenciaMs: 310, bateria: 91, senal: '-75 dBm', ...GALPON_A, severidad: 'NORMAL', fases: ['done', 'done', 'done', 'done', 'done', 'done', 'error'] }),
  lectura({ id: 'LEC-005', sensor: 'Sensor Desconocido', dispositivo: 'DEVICE-UNKNOWN-099', tipoDato: 'ESCALAR', variable: '—', categoria: '—', valor: null, valorAjustado: null, unidad: '', origen: 'TIEMPO_REAL', estado: 'ERROR_AUTENTICACION', capturado: D + '09:06:11', enviado: D + '09:06:12', procesado: D + '09:06:12', latenciaMs: null, bateria: null, senal: '—', area: null, areaCriticidad: null, severidad: null, fases: ['done', 'error', 'skip', 'skip', 'skip', 'skip', 'skip'] }),
  lectura({ id: 'LEC-006', sensor: 'Sensor Ambiental A-02', dispositivo: 'EDGE-GRANJA-001', tipoDato: 'ESCALAR', variable: 'Humedad Relativa', categoria: 'Ambiental', valor: 72.3, valorAjustado: 72.1, unidad: '%', origen: 'EDGE_AGREGADO', estado: 'LECTURA_VALIDA', capturado: D + '09:05:00', enviado: D + '09:10:01', procesado: D + '09:10:02', latenciaMs: 302000, bateria: 88, senal: '-77 dBm', ...GALPON_A, severidad: 'NORMAL', fases: OK7 }, { calibrado: true, agregado: true, latenciaAlta: true }),
  lectura({ id: 'LEC-007', sensor: 'Sensor Hídrico H-01', dispositivo: 'EDGE-ESTANQUE-002', tipoDato: 'ESCALAR', variable: 'Oxígeno Disuelto', categoria: 'Hídrica', valor: 1.2, valorAjustado: 1.2, unidad: 'mg/L', origen: 'TIEMPO_REAL', estado: 'FUERA_DE_RANGO', capturado: D + '09:03:47', enviado: D + '09:03:48', procesado: D + '09:03:48', latenciaMs: 290, bateria: 76, senal: '-80 dBm', area: 'Estanque 2 · área 9', areaCriticidad: 'ALTA', severidad: 'CRITICO', fases: ['done', 'done', 'done', 'done', 'error', 'done', 'done'] }, { calibrado: true }),
  lectura({ id: 'LEC-008', sensor: 'Sensor Ambiental A-01', dispositivo: 'EDGE-GRANJA-001', tipoDato: 'ESCALAR', variable: 'Temperatura Ambiental', categoria: 'Ambiental', valor: 28.4, valorAjustado: 28.2, unidad: '°C', origen: 'TIEMPO_REAL', estado: 'ERROR_DUPLICADO', capturado: D + '09:14:22', enviado: D + '09:14:30', procesado: D + '09:14:31', latenciaMs: null, bateria: 87, senal: '-78 dBm', ...GALPON_A, severidad: 'NORMAL', fases: ['done', 'done', 'done', 'done', 'done', 'error', 'skip'] }),
  lectura({ id: 'LEC-009', sensor: 'Sensor Biométrico B-04', dispositivo: 'EDGE-GALPONA-003', tipoDato: 'ESCALAR', variable: 'Temperatura Corporal', categoria: 'Animal', valor: 500, valorAjustado: null, unidad: '°C', origen: 'TIEMPO_REAL', estado: 'ERROR_SENSOR', capturado: D + '08:58:00', enviado: D + '08:58:01', procesado: D + '08:58:01', latenciaMs: null, bateria: 55, senal: '-85 dBm', ...GALPON_A, severidad: null, fases: ['done', 'done', 'done', 'done', 'error', 'skip', 'skip'] }),
  lectura({ id: 'LEC-010', sensor: 'Sensor Gas G-04', dispositivo: 'EDGE-GRANJA-002', tipoDato: 'ESCALAR', variable: 'Concentración CO2', categoria: 'Ambiental', valor: null, valorAjustado: null, unidad: 'ppm', origen: 'TIEMPO_REAL', estado: 'ERROR_ESTRUCTURA', capturado: D + '08:50:12', enviado: D + '08:50:12', procesado: D + '08:50:12', latenciaMs: null, bateria: null, senal: '—', area: null, areaCriticidad: null, severidad: null, fases: ['error', 'skip', 'skip', 'skip', 'skip', 'skip', 'skip'] }),
  lectura({ id: 'LEC-011', sensor: 'Sensor Ambiental A-05', dispositivo: 'EDGE-GRANJA-002', tipoDato: 'ESCALAR', variable: 'Temperatura Ambiental', categoria: 'Ambiental', valor: 31.8, valorAjustado: 31.6, unidad: '°C', origen: 'BUFFER_LOCAL', estado: 'LECTURA_VALIDA', capturado: D + '07:30:00', enviado: D + '09:02:15', procesado: D + '09:02:16', latenciaMs: 5535000, bateria: 38, senal: '-94 dBm', area: 'Galpón B · área 5', areaCriticidad: 'MEDIA', severidad: 'PRECAUCION', fases: OK7 }, { calibrado: true, latenciaAlta: true, frecAnomala: true }),
  lectura({ id: 'LEC-012', sensor: 'Sensor Hídrico H-02', dispositivo: 'EDGE-ESTANQUE-001', tipoDato: 'ESCALAR', variable: 'Conductividad Eléctrica', categoria: 'Hídrica', valor: 850.2, valorAjustado: 848, unidad: 'µS/cm', origen: 'TIEMPO_REAL', estado: 'LECTURA_VALIDA', capturado: D + '09:15:00', enviado: D + '09:15:01', procesado: D + '09:15:01', latenciaMs: 440, bateria: 92, senal: '-71 dBm', area: 'Estanque 1 · área 8', areaCriticidad: 'ALTA', severidad: 'NORMAL', fases: OK7 }, { calibrado: true }),
  lectura({ id: 'LEC-013', sensor: 'Sensor Biométrico B-04', dispositivo: 'EDGE-GRANJA-001', tipoDato: 'ESCALAR', variable: 'Temperatura Corporal', categoria: 'Animal', valor: 38.9, valorAjustado: null, unidad: '%', origen: 'TIEMPO_REAL', estado: 'ERROR_UNIDAD', capturado: D + '09:08:44', enviado: D + '09:08:44', procesado: D + '09:08:44', latenciaMs: 210, bateria: 71, senal: '-81 dBm', ...GALPON_A, severidad: null, fases: ['done', 'done', 'done', 'error', 'skip', 'skip', 'skip'] }),
  lectura({ id: 'LEC-014', sensor: 'Sensor Ambiental A-06', dispositivo: 'EDGE-GRANJA-003', tipoDato: 'ESCALAR', variable: 'Humedad Relativa', categoria: 'Ambiental', valor: 68.7, valorAjustado: null, unidad: '%', origen: 'TIEMPO_REAL', estado: 'ERROR_TIEMPO', capturado: D + '11:42:00', enviado: D + '09:18:00', procesado: D + '09:18:00', latenciaMs: null, bateria: 60, senal: '-80 dBm', area: 'Galpón C · área 6', areaCriticidad: 'BAJA', severidad: null, fases: ['done', 'done', 'error', 'skip', 'skip', 'skip', 'skip'] }),
  // Vector de comportamiento (visión) — RFC-011: sin valor ni unidad, sin calibración offset/ganancia.
  lectura({
    id: 'VIS-001', sensor: 'Cámara C-01', dispositivo: 'CAM-GALPON-A-01', tipoDato: 'VECTOR_COMPORTAMIENTO', variable: 'Vector de comportamiento', categoria: 'Visión (área)', valor: null, valorAjustado: null, unidad: '', origen: 'TIEMPO_REAL', estado: 'LECTURA_VALIDA', capturado: D + '09:10:00', enviado: D + '09:10:01', procesado: D + '09:10:01', latenciaMs: 380, bateria: null, senal: '—', ...GALPON_A, severidad: 'NORMAL', fases: ['done', 'done', 'done', 'done', 'done', 'done', 'skip'],
    vision: { area: 'Galpón A · área 4', ventanaInicio: '09:05:00', ventanaFin: '09:10:00', individuos: 42, densidad: 0.6213, dispersion: 3.417, tasa: 1.2085, calidad: { cobertura_ventana: '0.96 (D)', n_tracks_perdidos: '2 (D)', fps_efectivo: '12.0 (D)', estado_calibracion: 'D' } },
  }, { agregado: true }),
  lectura({
    id: 'VIS-002', sensor: 'Cámara C-03', dispositivo: 'CAM-CUARENTENA-01', tipoDato: 'VECTOR_COMPORTAMIENTO', variable: 'Vector de comportamiento', categoria: 'Visión (área)', valor: null, valorAjustado: null, unidad: '', origen: 'BUFFER_LOCAL', estado: 'LECTURA_VALIDA', capturado: D + '06:45:00', enviado: D + '09:01:10', procesado: D + '09:01:11', latenciaMs: 8171000, bateria: null, senal: '—', area: 'Corral cuarentena · área 7', areaCriticidad: 'BAJA', severidad: 'NORMAL', fases: ['done', 'done', 'done', 'done', 'done', 'done', 'skip'],
    vision: { area: 'Corral cuarentena · área 7', ventanaInicio: '06:40:00', ventanaFin: '06:45:00', individuos: 0, densidad: 0, dispersion: 0, tasa: 0, calidad: { cobertura_ventana: '1.00 (D)', n_tracks_perdidos: '0 (D)', fps_efectivo: '12.0 (D)', estado_calibracion: 'D' } },
  }, { agregado: true, latenciaAlta: true }),
  lectura({
    id: 'VIS-003', sensor: 'Cámara C-02', dispositivo: 'CAM-GALPON-B-01', tipoDato: 'VECTOR_COMPORTAMIENTO', variable: 'Vector de comportamiento', categoria: 'Visión (área)', valor: null, valorAjustado: null, unidad: '', origen: 'TIEMPO_REAL', estado: 'ERROR_ESTRUCTURA', capturado: D + '09:00:00', enviado: D + '09:00:01', procesado: D + '09:00:01', latenciaMs: null, bateria: null, senal: '—', area: null, areaCriticidad: null, severidad: null, fases: ['error', 'skip', 'skip', 'skip', 'skip', 'skip', 'skip'],
    vision: { area: 'Galpón B · área 5', ventanaInicio: '08:55:00', ventanaFin: '09:00:00', individuos: 37, densidad: 0.487, dispersion: 2.901, tasa: 0.884, calidad: null },
  }),
];

// Prioridad compuesta E15 (RFC-016): solo reordena, nunca descarta. Menor = se procesa antes.
const RANK_SEV = { CRITICO: 0, PRECAUCION: 1, NORMAL: 1 };   // binaria: crítico vs. no crítico
const RANK_AREA = { ALTA: 0, MEDIA: 1, BAJA: 2 };
const RANK_ORIGEN = { TIEMPO_REAL: 0, EDGE_AGREGADO: 0, BUFFER_LOCAL: 1 };

/** Severidad › criticidad del área (sin área = MEDIA, RF-20) › origen › antigüedad (FIFO). */
export function compararPrioridad(a: LecturaIngestaMock, b: LecturaIngestaMock): number {
  const clave = (l: LecturaIngestaMock) => [
    l.severidad ? RANK_SEV[l.severidad] : 1,
    l.areaCriticidad ? RANK_AREA[l.areaCriticidad] : 1,
    RANK_ORIGEN[l.origen],
  ];
  const ka = clave(a), kb = clave(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return a.capturado.localeCompare(b.capturado);
}
