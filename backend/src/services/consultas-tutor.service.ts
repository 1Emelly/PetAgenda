import { pool } from "../config/database.js";

export async function listarConsultasDoTutor(
  usuarioId: number
) {
  const resultado = await pool.query(
    `SELECT
       c.id,
       c.animal_id AS "animalId",
       c.veterinario_id AS "veterinarioId",
       c.data_hora AS "dataHora",
       c.motivo,
       c.status
     FROM consultas c
     INNER JOIN animais a
       ON a.id = c.animal_id
     INNER JOIN tutores t
       ON t.id = a.tutor_id
     WHERE t.usuario_id = $1
     ORDER BY c.data_hora DESC`,
    [usuarioId]
  );

  return resultado.rows;
}