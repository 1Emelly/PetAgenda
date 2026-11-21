import { pool } from "../config/database.js";

export interface TutorVeterinario {
  id: number;
  nome: string;
  telefone: string;
  email: string;
}

export async function listarTutoresDoVeterinario(
  usuarioId: number
): Promise<TutorVeterinario[]> {
  const resultado = await pool.query<TutorVeterinario>(
    `SELECT DISTINCT
       t.id,
       t.nome,
       t.telefone,
       t.email
     FROM tutores t
     INNER JOIN animais a
       ON a.tutor_id = t.id
     INNER JOIN consultas c
       ON c.animal_id = a.id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE v.usuario_id = $1
     ORDER BY t.id`,
    [usuarioId]
  );

  return resultado.rows;
}

export async function verificarAcessoTutorVeterinario(
  tutorId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM tutores t
     INNER JOIN animais a
       ON a.tutor_id = t.id
     INNER JOIN consultas c
       ON c.animal_id = a.id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE t.id = $1
       AND v.usuario_id = $2
     LIMIT 1`,
    [tutorId, usuarioId]
  );

  return resultado.rows.length > 0;
}