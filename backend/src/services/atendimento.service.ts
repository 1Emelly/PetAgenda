import { pool } from "../config/database.js";

export interface Atendimento {
  id: number;
  consultaId: number;
  diagnostico: string | null;
  procedimentos: string | null;
  observacoes: string | null;
  orientacoes: string | null;
  dataAtendimento: string;
}

interface AtendimentoBanco {
  id: number;
  consulta_id: number;
  diagnostico: string | null;
  procedimentos: string | null;
  observacoes: string | null;
  orientacoes: string | null;
  data_atendimento: Date;
}

export interface DadosAtendimento {
  consultaId: number;
  diagnostico: string;
  procedimentos?: string;
  observacoes?: string;
  orientacoes?: string;
}

export interface DadosAtualizacaoAtendimento {
  diagnostico?: string;
  procedimentos?: string;
  observacoes?: string;
  orientacoes?: string;
}

const camposAtendimento = `
  id,
  consulta_id,
  diagnostico,
  procedimentos,
  observacoes,
  orientacoes,
  data_atendimento
`;

function converterAtendimento(
  registro: AtendimentoBanco
): Atendimento {
  return {
    id: registro.id,
    consultaId: registro.consulta_id,
    diagnostico: registro.diagnostico,
    procedimentos: registro.procedimentos,
    observacoes: registro.observacoes,
    orientacoes: registro.orientacoes,
    dataAtendimento: registro.data_atendimento.toISOString()
  };
}

export async function listarTodosAtendimentos(): Promise<Atendimento[]> {
  const resultado = await pool.query<AtendimentoBanco>(
    `SELECT ${camposAtendimento}
     FROM atendimentos
     ORDER BY id`
  );

  return resultado.rows.map(converterAtendimento);
}

export async function buscarAtendimentoPorId(
  id: number
): Promise<Atendimento | undefined> {
  const resultado = await pool.query<AtendimentoBanco>(
    `SELECT ${camposAtendimento}
     FROM atendimentos
     WHERE id = $1`,
    [id]
  );

  const registro = resultado.rows[0];

  return registro
    ? converterAtendimento(registro)
    : undefined;
}

export async function buscarAtendimentoPorConsulta(
  consultaId: number
): Promise<Atendimento | undefined> {
  const resultado = await pool.query<AtendimentoBanco>(
    `SELECT ${camposAtendimento}
     FROM atendimentos
     WHERE consulta_id = $1`,
    [consultaId]
  );

  const registro = resultado.rows[0];

  return registro
    ? converterAtendimento(registro)
    : undefined;
}

export async function cadastrarNovoAtendimento(
  dados: DadosAtendimento
): Promise<Atendimento> {
  const resultado = await pool.query<AtendimentoBanco>(
    `INSERT INTO atendimentos (
      consulta_id,
      diagnostico,
      procedimentos,
      observacoes,
      orientacoes
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${camposAtendimento}`,
    [
      dados.consultaId,
      dados.diagnostico,
      dados.procedimentos ?? null,
      dados.observacoes ?? null,
      dados.orientacoes ?? null
    ]
  );

  return converterAtendimento(resultado.rows[0]);
}

export async function atualizarDadosAtendimento(
  id: number,
  dados: DadosAtualizacaoAtendimento
): Promise<Atendimento | undefined> {
  const campos: string[] = [];
  const valores: unknown[] = [];

  const camposPermitidos: Array<
    keyof DadosAtualizacaoAtendimento
  > = [
    "diagnostico",
    "procedimentos",
    "observacoes",
    "orientacoes"
  ];

  for (const campo of camposPermitidos) {
    const valor = dados[campo];

    if (valor !== undefined) {
      valores.push(valor);
      campos.push(`${campo} = $${valores.length}`);
    }
  }

  if (campos.length === 0) {
    return buscarAtendimentoPorId(id);
  }

  valores.push(id);

  const resultado = await pool.query<AtendimentoBanco>(
    `UPDATE atendimentos
     SET ${campos.join(", ")}
     WHERE id = $${valores.length}
     RETURNING ${camposAtendimento}`,
    valores
  );

  const registro = resultado.rows[0];

  return registro
    ? converterAtendimento(registro)
    : undefined;
}