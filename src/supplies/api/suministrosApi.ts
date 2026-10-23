// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-75/RF-76: consumo de alimentos y aplicación de medicamentos |
import { http } from '../../shared/api/http';
import type {
  ConsumoAlimento, FiltrosRegistros, Lista, Medicamento, RegistrarConsumoPayload,
  RegistrarMedicamentoPayload, RegistroMedicamentoRespuesta,
} from '../types';

const CONSUMOS = '/suministros/consumo-alimentos';
const MEDICAMENTOS = '/suministros/medicamentos';

/** RF-75 / RF-76. Un registro VALIDADO no se edita (405): solo se anula con justificación. */
export const suministrosApi = {
  async listarConsumos(filtros: FiltrosRegistros): Promise<Lista<ConsumoAlimento>> {
    return (await http.get<Lista<ConsumoAlimento>>(CONSUMOS, { params: filtros })).data;
  },
  async registrarConsumo(payload: RegistrarConsumoPayload): Promise<ConsumoAlimento> {
    return (await http.post<ConsumoAlimento>(CONSUMOS, payload)).data;
  },
  async anularConsumo(id: number, justificacion: string): Promise<ConsumoAlimento> {
    return (await http.post<ConsumoAlimento>(`${CONSUMOS}/${id}/anulacion`, { justificacion_anulacion: justificacion })).data;
  },
  async listarMedicamentos(filtros: FiltrosRegistros): Promise<Lista<Medicamento>> {
    return (await http.get<Lista<Medicamento>>(MEDICAMENTOS, { params: filtros })).data;
  },
  async registrarMedicamento(payload: RegistrarMedicamentoPayload): Promise<RegistroMedicamentoRespuesta> {
    return (await http.post<RegistroMedicamentoRespuesta>(MEDICAMENTOS, payload)).data;
  },
  async anularMedicamento(id: number, justificacion: string): Promise<Medicamento> {
    return (await http.post<Medicamento>(`${MEDICAMENTOS}/${id}/anulacion`, { justificacion_anulacion: justificacion })).data;
  },
};
