// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: aristas de transmisión de la finca (GET /configuracion/topologia-sanitaria/aristas) |
// | 2026-11-02 | Arekkazu | RF-110: declarar, editar y quitar relaciones entre áreas |
import { http } from '../../shared/api/http';
import type { AristaGrafo } from '../components/GrafoTopologia';

export const VIAS = ['PROXIMIDAD', 'AIRE', 'AGUA', 'PERSONAL', 'FOMITES', 'ALIMENTO', 'MOVIMIENTO_ANIMAL'] as const;

/** Arista con lo que se puede editar; peso = intensidad × barrera. */
export interface AristaTopologia extends AristaGrafo { intensidad: number; barrera: number; descripcion: string | null }

export interface AristaPayload {
  via: string;
  direccion: 'DIRIGIDA' | 'BIDIRECCIONAL';
  intensidad: number;
  factor_barrera: number;
  descripcion: string | null;
}

interface AristaTransmisionResponse extends AristaPayload {
  id_arista_transmision: number;
  id_infraestructura_origen: number;
  id_infraestructura_destino: number;
  /** El backend serializa los Decimal como texto. */
  intensidad: number;
  peso: string | number;
}

const URL = '/configuracion/topologia-sanitaria/aristas';
const aArista = (a: AristaTransmisionResponse): AristaTopologia => ({
  id: a.id_arista_transmision, origen: a.id_infraestructura_origen, destino: a.id_infraestructura_destino,
  via: a.via, bidireccional: a.direccion === 'BIDIRECCIONAL', peso: Number(a.peso),
  intensidad: Number(a.intensidad), barrera: Number(a.factor_barrera), descripcion: a.descripcion,
});

export const topologiaApi = {
  async listarAristas(idFinca: number): Promise<AristaTopologia[]> {
    const res = await http.get<AristaTransmisionResponse[]>(URL, { params: { id_finca: idFinca } });
    return res.data.map(aArista);
  },
  async registrar(origen: number, destino: number, datos: AristaPayload): Promise<AristaTopologia> {
    const res = await http.post<AristaTransmisionResponse>(URL, { id_infraestructura_origen: origen, id_infraestructura_destino: destino, ...datos });
    return aArista(res.data);
  },
  async editar(id: number, datos: AristaPayload): Promise<AristaTopologia> {
    const res = await http.patch<AristaTransmisionResponse>(`${URL}/${id}`, datos);
    return aArista(res.data);
  },
  async desactivar(id: number): Promise<void> {
    await http.patch(`${URL}/${id}/desactivar`);
  },
};
