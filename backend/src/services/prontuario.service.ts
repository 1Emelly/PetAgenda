import { pool } from "../config/database.js";

export interface Prontuario {
  id: number;
  animalId: number;
  atendimentoId: number;
  descricao: string | null;
  criadoEm: string;
}

interface ProntuarioBanco {
  id: number;
  animal_id: number;
  atendimento_id: number;
  descricao: string | null;
  criado_em: Date;
}

export interface DadosProntuario {
  animalId: number;
  atendimentoId: number;
  descricao: string;
}

const camposProntuario = `
  id,
  animal_id,
  atendimento_id,
  descricao,
  criado_em
`;

function converterProntuario(
  registro: ProntuarioBanco
): Prontuario {
  return {
    id: registro.id,
    animalId: registro.animal_id,
    atendimentoId: registro.atendimento_id,
    descricao: registro.descricao,
    criadoEm: registro.criado_em.toISOString()
  };
}

export async function listarTodosProntuarios(): Promise<Prontuario[]> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT ${camposProntuario}
     FROM prontuarios
     ORDER BY id`
  );

  return resultado.rows.map(converterProntuario);
}

export async function buscarProntuarioPorId(
  id: number
): Promise<Prontuario | undefined> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT ${camposProntuario}
     FROM prontuarios
     WHERE id = $1`,
    [id]
  );

  const registro = resultado.rows[0];

  return registro
    ? converterProntuario(registro)
    : undefined;
}

export async function listarProntuariosPorAnimal(
  animalId: number
): Promise<Prontuario[]> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT ${camposProntuario}
     FROM prontuarios
     WHERE animal_id = $1
     ORDER BY criado_em DESC, id DESC`,
    [animalId]
  );

  return resultado.rows.map(converterProntuario);
}

export async function buscarProntuarioPorAtendimento(
  atendimentoId: number
): Promise<Prontuario | undefined> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT ${camposProntuario}
     FROM prontuarios
     WHERE atendimento_id = $1`,
    [atendimentoId]
  );

  const registro = resultado.rows[0];

  return registro
    ? converterProntuario(registro)
    : undefined;
}

export async function cadastrarNovoProntuario(
  dados: DadosProntuario
): Promise<Prontuario> {
  const resultado = await pool.query<ProntuarioBanco>(
    `INSERT INTO prontuarios (
      animal_id,
      atendimento_id,
      descricao
    )
    VALUES ($1, $2, $3)
    RETURNING ${camposProntuario}`,
    [
      dados.animalId,
      dados.atendimentoId,
      dados.descricao
    ]
  );

  return converterProntuario(resultado.rows[0]);
}

export async function atualizarDescricaoProntuario(
  id: number,
  descricao: string
): Promise<Prontuario | undefined> {
  const resultado = await pool.query<ProntuarioBanco>(
    `UPDATE prontuarios
     SET descricao = $1
     WHERE id = $2
     RETURNING ${camposProntuario}`,
    [descricao, id]
  );

  const registro = resultado.rows[0];

  return registro
    ? converterProntuario(registro)
    : undefined;
}