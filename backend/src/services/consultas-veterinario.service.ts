import { pool } from "../config/database.js";

import type {
  Consulta
} from "./consulta.service.js";

import type {
  StatusConsulta
} from "./consulta.schema.js";

interface ConsultaBanco {
  id: number;
  animal_id: number;
  veterinario_id: number;
  data_hora: Date;
  motivo: string;
  status: StatusConsulta;
}

export async function listarConsultasDoVeterinario(
  usuarioId: number
): Promise<Consulta[]> {
  const resultado = await pool.query<ConsultaBanco>(
    `SELECT
       c.id,
       c.animal_id,
       c.veterinario_id,
       c.data_hora,
       c.motivo,
       c.status
     FROM consultas c
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE v.usuario_id = $1
     ORDER BY c.id`,
    [usuarioId]
  );

  return resultado.rows.map((registro) => ({
    id: registro.id,
    animalId: registro.animal_id,
    veterinarioId: registro.veterinario_id,
    dataHora: registro.data_hora.toISOString(),
    motivo: registro.motivo,
    status: registro.status
  }));
}