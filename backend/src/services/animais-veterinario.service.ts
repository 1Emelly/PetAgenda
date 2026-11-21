import { pool } from "../config/database.js";

import type {
  Animal
} from "./animal.service.js";

import {
  buscarTutorPorId
} from "./tutor.service.js";

interface AnimalBanco {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutor_id: number;
}

export async function listarAnimaisDoVeterinario(
  usuarioId: number
) {
  const resultado = await pool.query<AnimalBanco>(
    `SELECT DISTINCT
       a.id,
       a.nome,
       a.especie,
       a.raca,
       a.idade,
       a.tutor_id
     FROM animais a
     INNER JOIN consultas c
       ON c.animal_id = a.id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE v.usuario_id = $1
     ORDER BY a.id`,
    [usuarioId]
  );

  return Promise.all(
    resultado.rows.map(async (registro) => {
      const animal: Animal = {
        id: registro.id,
        nome: registro.nome,
        especie: registro.especie,
        raca: registro.raca,
        idade: registro.idade,
        tutorId: registro.tutor_id
      };

      const tutor = await buscarTutorPorId(
        animal.tutorId
      );

      return {
        ...animal,
        tutor: tutor
          ? {
              id: tutor.id,
              nome: tutor.nome
            }
          : null
      };
    })
  );
}