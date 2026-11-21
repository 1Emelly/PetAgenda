import { pool } from "../config/database.js";

import type {
  Animal
} from "./animal.service.js";

interface AnimalBanco {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutor_id: number;
}

export async function listarAnimaisDoTutor(
  usuarioId: number
): Promise<Animal[]> {
  const resultado = await pool.query<AnimalBanco>(
    `SELECT
       a.id,
       a.nome,
       a.especie,
       a.raca,
       a.idade,
       a.tutor_id
     FROM animais a
     INNER JOIN tutores t
       ON t.id = a.tutor_id
     WHERE t.usuario_id = $1
     ORDER BY a.id`,
    [usuarioId]
  );

  return resultado.rows.map((registro) => ({
    id: registro.id,
    nome: registro.nome,
    especie: registro.especie,
    raca: registro.raca,
    idade: registro.idade,
    tutorId: registro.tutor_id
  }));
}