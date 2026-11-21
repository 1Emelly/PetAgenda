import { pool } from "../config/database.js";

import type {
  Atendimento
} from "./atendimento.service.js";

interface AtendimentoBanco {
  id: number;
  consulta_id: number;
  diagnostico: string | null;
  procedimentos: string | null;
  observacoes: string | null;
  orientacoes: string | null;
  data_atendimento: Date;
}

export async function listarAtendimentosDoVeterinario(
  usuarioId: number
): Promise<Atendimento[]> {
  const resultado = await pool.query<AtendimentoBanco>(
    `SELECT
       a.id,
       a.consulta_id,
       a.diagnostico,
       a.procedimentos,
       a.observacoes,
       a.orientacoes,
       a.data_atendimento
     FROM atendimentos a
     INNER JOIN consultas c
       ON c.id = a.consulta_id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE v.usuario_id = $1
     ORDER BY a.id`,
    [usuarioId]
  );

  return resultado.rows.map((registro) => ({
    id: registro.id,
    consultaId: registro.consulta_id,
    diagnostico: registro.diagnostico,
    procedimentos: registro.procedimentos,
    observacoes: registro.observacoes,
    orientacoes: registro.orientacoes,
    dataAtendimento:
      registro.data_atendimento.toISOString()
  }));
}