import { pool } from "../config/database.js";
import { buscarTutorPorId } from "./tutor.service.js";

export interface Animal {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutorId: number;
}

interface AnimalBanco {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutor_id: number;
}

function converterAnimal(animal: AnimalBanco): Animal {
  return {
    id: animal.id,
    nome: animal.nome,
    especie: animal.especie,
    raca: animal.raca,
    idade: animal.idade,
    tutorId: animal.tutor_id
  };
}

export async function listarTodosAnimais() {
  const resultado = await pool.query<AnimalBanco>(
    `SELECT id, nome, especie, raca, idade, tutor_id
     FROM animais
     ORDER BY id`
  );

  return Promise.all(
    resultado.rows.map(async (registro) => {
      const animal = converterAnimal(registro);
      const tutor = await buscarTutorPorId(animal.tutorId);

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

export async function cadastrarNovoAnimal(
  dados: Omit<Animal, "id">
): Promise<Animal> {
  const resultado = await pool.query<AnimalBanco>(
    `INSERT INTO animais
     (nome, especie, raca, idade, tutor_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, especie, raca, idade, tutor_id`,
    [
      dados.nome,
      dados.especie,
      dados.raca,
      dados.idade,
      dados.tutorId
    ]
  );

  return converterAnimal(resultado.rows[0]);
}

export async function buscarAnimalPorId(
  id: number
): Promise<Animal | undefined> {
  const resultado = await pool.query<AnimalBanco>(
    `SELECT id, nome, especie, raca, idade, tutor_id
     FROM animais
     WHERE id = $1`,
    [id]
  );

  const animal = resultado.rows[0];

  return animal ? converterAnimal(animal) : undefined;
}

export async function atualizarAnimal(
  id: number,
  dados: Omit<Animal, "id">
): Promise<Animal | undefined> {
  const resultado = await pool.query<AnimalBanco>(
    `UPDATE animais
     SET nome = $1,
         especie = $2,
         raca = $3,
         idade = $4,
         tutor_id = $5
     WHERE id = $6
     RETURNING id, nome, especie, raca, idade, tutor_id`,
    [
      dados.nome,
      dados.especie,
      dados.raca,
      dados.idade,
      dados.tutorId,
      id
    ]
  );

  const animal = resultado.rows[0];

  return animal ? converterAnimal(animal) : undefined;
}

export async function excluirAnimal(id: number): Promise<boolean> {
  const resultado = await pool.query(
    "DELETE FROM animais WHERE id = $1",
    [id]
  );

  return (resultado.rowCount ?? 0) > 0;
}