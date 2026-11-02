// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-11-02 | Arekkazu | RFC-021 RF-110: aristas de transmisión de la finca (GET /configuracion/topologia-sanitaria/aristas) |
import { http } from '../../shared/api/http';
import type { AristaGrafo } from '../components/GrafoTopologia';

interface AristaTransmisionResponse {
  id_arista_transmision: number;
  id_infraestructura_origen: number;
  id_infraestructura_destino: number;
  via: string;
  direccion: 'DIRIGIDA' | 'BIDIRECCIONAL';
  /** intensidad × factor_barrera; el backend serializa los Decimal como texto. */
  peso: string | number;
}

export const topologiaApi = {
  async listarAristas(idFinca: number): Promise<AristaGrafo[]> {
    const res = await http.get<AristaTransmisionResponse[]>('/configuracion/topologia-sanitaria/aristas', { params: { id_finca: idFinca } });
    return res.data.map((a) => ({
      id: a.id_arista_transmision, origen: a.id_infraestructura_origen, destino: a.id_infraestructura_destino,
      via: a.via, bidireccional: a.direccion === 'BIDIRECCIONAL', peso: Number(a.peso),
    }));
  },
};
