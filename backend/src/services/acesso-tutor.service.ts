import { pool } from "../config/database.js";

export interface TutorVinculado {
  id: number;
  usuarioId: number;
}

export async function buscarTutorDoUsuario(
  usuarioId: number
): Promise<TutorVinculado | undefined> {
  const resultado = await pool.query<{
    id: number;
    usuario_id: number;
  }>(
    `SELECT id, usuario_id
     FROM tutores
     WHERE usuario_id = $1
     LIMIT 1`,
    [usuarioId]
  );

  const registro = resultado.rows[0];

  if (!registro) {
    return undefined;
  }

  return {
    id: registro.id,
    usuarioId: registro.usuario_id
  };
}

export async function verificarAcessoAnimalTutor(
  animalId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM animais a
     INNER JOIN tutores t
       ON t.id = a.tutor_id
     WHERE a.id = $1
       AND t.usuario_id = $2
     LIMIT 1`,
    [animalId, usuarioId]
  );

  return resultado.rows.length > 0;
}

export async function verificarAcessoConsultaTutor(
  consultaId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM consultas c
     INNER JOIN animais a
       ON a.id = c.animal_id
     INNER JOIN tutores t
       ON t.id = a.tutor_id
     WHERE c.id = $1
       AND t.usuario_id = $2
     LIMIT 1`,
    [consultaId, usuarioId]
  );

  return resultado.rows.length > 0;
}