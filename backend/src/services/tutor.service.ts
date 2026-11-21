import { pool } from "../config/database.js";

interface Tutor {
  id: number;
  nome: string;
  telefone: string;
  email: string;
}

export async function listarTodosTutores(): Promise<Tutor[]> {
  const resultado = await pool.query<Tutor>(
    "SELECT id, nome, telefone, email FROM tutores ORDER BY id"
  );

  return resultado.rows;
}

export async function cadastrarNovoTutor(
  dados: Omit<Tutor, "id">
): Promise<Tutor> {
  const resultado = await pool.query<Tutor>(
    `INSERT INTO tutores (nome, telefone, email)
     VALUES ($1, $2, $3)
     RETURNING id, nome, telefone, email`,
    [dados.nome, dados.telefone, dados.email]
  );

  return resultado.rows[0];
}

export async function buscarTutorPorId(
  id: number
): Promise<Tutor | undefined> {
  const resultado = await pool.query<Tutor>(
    "SELECT id, nome, telefone, email FROM tutores WHERE id = $1",
    [id]
  );

  return resultado.rows[0];
}

export async function atualizarTutor(
  id: number,
  dados: Omit<Tutor, "id">
): Promise<Tutor | undefined> {
  const resultado = await pool.query<Tutor>(
    `UPDATE tutores
     SET nome = $1, telefone = $2, email = $3
     WHERE id = $4
     RETURNING id, nome, telefone, email`,
    [dados.nome, dados.telefone, dados.email, id]
  );

  return resultado.rows[0];
}

export async function excluirTutor(id: number): Promise<boolean> {
  const resultado = await pool.query(
    "DELETE FROM tutores WHERE id = $1",
    [id]
  );

  return (resultado.rowCount ?? 0) > 0;
}