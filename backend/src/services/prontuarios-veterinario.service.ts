import { pool } from "../config/database.js";

import type {
  Prontuario
} from "./prontuario.service.js";

interface ProntuarioBanco {
  id: number;
  animal_id: number;
  atendimento_id: number;
  descricao: string | null;
  criado_em: Date;
}

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

export async function listarProntuariosDoVeterinario(
  usuarioId: number
): Promise<Prontuario[]> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT
       p.id,
       p.animal_id,
       p.atendimento_id,
       p.descricao,
       p.criado_em
     FROM prontuarios p
     INNER JOIN atendimentos a
       ON a.id = p.atendimento_id
     INNER JOIN consultas c
       ON c.id = a.consulta_id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE v.usuario_id = $1
     ORDER BY p.id`,
    [usuarioId]
  );

  return resultado.rows.map(converterProntuario);
}

export async function listarProntuariosDoAnimalPorVeterinario(
  animalId: number,
  usuarioId: number
): Promise<Prontuario[]> {
  const resultado = await pool.query<ProntuarioBanco>(
    `SELECT
       p.id,
       p.animal_id,
       p.atendimento_id,
       p.descricao,
       p.criado_em
     FROM prontuarios p
     INNER JOIN atendimentos a
       ON a.id = p.atendimento_id
     INNER JOIN consultas c
       ON c.id = a.consulta_id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE p.animal_id = $1
       AND v.usuario_id = $2
     ORDER BY p.criado_em DESC, p.id DESC`,
    [animalId, usuarioId]
  );

  return resultado.rows.map(converterProntuario);
}