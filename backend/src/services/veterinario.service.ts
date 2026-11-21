import { pool } from "../config/database.js";

export interface Veterinario {
  id: number;
  nome: string;
  crmv: string;
  telefone: string;
  email: string;
}

export async function listarTodosVeterinarios(): Promise<Veterinario[]> {
  const resultado = await pool.query<Veterinario>(
    `SELECT id, nome, crmv, telefone, email
     FROM veterinarios
     ORDER BY id`
  );

  return resultado.rows;
}

export async function cadastrarNovoVeterinario(
  dados: Omit<Veterinario, "id">
): Promise<Veterinario> {
  const resultado = await pool.query<Veterinario>(
    `INSERT INTO veterinarios (nome, crmv, telefone, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, crmv, telefone, email`,
    [
      dados.nome,
      dados.crmv,
      dados.telefone,
      dados.email
    ]
  );

  return resultado.rows[0];
}

export async function buscarVeterinarioPorId(
  id: number
): Promise<Veterinario | undefined> {
  const resultado = await pool.query<Veterinario>(
    `SELECT id, nome, crmv, telefone, email
     FROM veterinarios
     WHERE id = $1`,
    [id]
  );

  return resultado.rows[0];
}

export async function atualizarVeterinario(
  id: number,
  dados: Omit<Veterinario, "id">
): Promise<Veterinario | undefined> {
  const resultado = await pool.query<Veterinario>(
    `UPDATE veterinarios
     SET nome = $1,
         crmv = $2,
         telefone = $3,
         email = $4
     WHERE id = $5
     RETURNING id, nome, crmv, telefone, email`,
    [
      dados.nome,
      dados.crmv,
      dados.telefone,
      dados.email,
      id
    ]
  );

  return resultado.rows[0];
}

export async function excluirVeterinario(
  id: number
): Promise<boolean> {
  const resultado = await pool.query(
    "DELETE FROM veterinarios WHERE id = $1",
    [id]
  );

  return (resultado.rowCount ?? 0) > 0;
}