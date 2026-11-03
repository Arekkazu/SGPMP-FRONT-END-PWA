// | Fecha      | Nombre   | Que se hizo |
// |------------|----------|-------------|
// | 2026-10-23 | Arekkazu | M05 RF-78/RF-79: costeo directo del ciclo y provisión NIC-41 |
import { http } from '../../shared/api/http';
import type {
  AcumuladoCiclo, CorreccionSuministroPayload, ProvisionNic41, RegistrarSuministroDirectoPayload,
  ResultadoRegistroSuministro,
} from '../types';

const COSTEO = '/suministros/costeo-directo';
const NIC41 = '/suministros/nic41';

export const costeoApi = {
  /** 404 si el activo no tiene ciclo productivo activo. */
  async acumuladoActivo(idActivo: number): Promise<AcumuladoCiclo> {
    return (await http.get<AcumuladoCiclo>(`${COSTEO}/acumulado/activo/${idActivo}`)).data;
  },
  async registrar(payload: RegistrarSuministroDirectoPayload): Promise<ResultadoRegistroSuministro> {
    return (await http.post<ResultadoRegistroSuministro>(COSTEO, payload)).data;
  },
  /** RF-78 E7: la corrección es aditiva (nuevo registro CORRECCION ligado al original). */
  async corregir(idRegistroOriginal: string, payload: CorreccionSuministroPayload): Promise<ResultadoRegistroSuministro> {
    return (await http.post<ResultadoRegistroSuministro>(`${COSTEO}/${idRegistroOriginal}/correccion`, payload)).data;
  },
  async versionesNic41(idGestionFases: number): Promise<{ total: number; versiones: ProvisionNic41[] }> {
    return (await http.get<{ total: number; versiones: ProvisionNic41[] }>(`${NIC41}/ciclo/${idGestionFases}/versiones`)).data;
  },
  async consolidarNic41(idGestionFases: number): Promise<ProvisionNic41> {
    return (await http.post<ProvisionNic41>(`${NIC41}/ciclo/${idGestionFases}/consolidar`)).data;
  },
  async detalleNic41(idProvision: number, pagina = 1): Promise<ProvisionNic41> {
    return (await http.get<ProvisionNic41>(`${NIC41}/${idProvision}`, { params: { pagina, por_pagina: 50 } })).data;
  },
  async corregirNic41(idProvision: number, motivo: string): Promise<ProvisionNic41> {
    return (await http.post<ProvisionNic41>(`${NIC41}/${idProvision}/correccion`, { motivo_correccion: motivo })).data;
  },
};
