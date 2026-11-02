// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RF-110: color por tipo de área para el grafo de topología |
import {
  Beef, Bird, Building2, ChartColumn, ChartLine, Cloud, Cpu, Droplets, Fence, Fish, FlaskConical, Hourglass, House,
  OctagonAlert, Package, Radio, Sprout, Sun, Thermometer, Trees, TriangleAlert, Warehouse, Waves, Wind, Wrench,
  type LucideIcon,
} from 'lucide-react';

// Mapeo best-effort: una categoria o un tipo de area agregado desde el catalogo
// (RF-20) no tiene icono propio y cae al generico.
const POR_CATEGORIA: Record<string, LucideIcon> = {
  TEMPERATURA: Thermometer,
  HUMEDAD: Droplets,
  OXIGENO: Wind,
  PH: FlaskConical,
  AMONIACO: Cloud,
  SALINIDAD: Waves,
  LUMINOSIDAD: Sun,
};

const POR_TIPO_AREA: Record<string, LucideIcon> = {
  'Galpón': Warehouse,
  'Corral': Fence,
  'Potrero': Trees,
  'Estanque': Fish,
  'Invernadero': Sprout,
};

export function iconoCategoriaSensor(categoria: string | null | undefined): LucideIcon {
  return (categoria && POR_CATEGORIA[categoria]) || Radio;
}

export function iconoTipoArea(tipo: string): LucideIcon {
  return POR_TIPO_AREA[tipo] ?? Building2;
}

// Color de cada tipo de área en el grafo de topología (RF-110). Tonos medios que contrastan con un
// ícono blanco en tema claro y oscuro; un tipo nuevo del catálogo toma uno fijo según su nombre.
const COLOR_TIPO_AREA: Record<string, string> = {
  'Galpón': '#d97706',
  'Corral': '#a0522d',
  'Potrero': '#2e8634',
  'Estanque': '#1a6abf',
  'Invernadero': '#0d9488',
};
const COLORES_EXTRA = ['#7c3aed', '#db2777', '#4f46e5', '#b45309', '#0891b2'];

export function colorTipoArea(tipo: string): string {
  return COLOR_TIPO_AREA[tipo] ?? COLORES_EXTRA[[...tipo].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORES_EXTRA.length];
}

// Iconos de los widgets del dashboard (RF-28). El catalogo lo define el backend;
// el icono es presentacion pura y una clave nueva cae al generico.
const POR_WIDGET: Record<string, LucideIcon> = {
  temp_galpon: Thermometer,
  hum_galpon: Droplets,
  ph_estanque: FlaskConical,
  co2_galpon: Wind,
  temp_corral: Thermometer,
  estado_iot: Cpu,
  cal_sensores: Wrench,
  alertas: TriangleAlert,
  alertas_crit: OctagonAlert,
  hist_temp: ChartLine,
  hist_hum: ChartColumn,
  prod_aves: Bird,
  prod_bovinos: Beef,
  fincas_estado: House,
  cfg_pendiente: Hourglass,
};

export function iconoWidget(clave: string): LucideIcon {
  return POR_WIDGET[clave] ?? Package;
}
