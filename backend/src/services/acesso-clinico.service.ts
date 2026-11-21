import { pool } from "../config/database.js";

export interface VeterinarioVinculado {
  id: number;
  usuarioId: number;
}

export async function buscarVeterinarioDoUsuario(
  usuarioId: number
): Promise<VeterinarioVinculado | undefined> {
  const resultado = await pool.query<{
    id: number;
    usuario_id: number;
  }>(
    `SELECT id, usuario_id
     FROM veterinarios
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

export async function verificarAcessoConsultaVeterinario(
  consultaId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM consultas c
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE c.id = $1
       AND v.usuario_id = $2
     LIMIT 1`,
    [consultaId, usuarioId]
  );

  return resultado.rows.length > 0;
}

export async function verificarAcessoAtendimentoVeterinario(
  atendimentoId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM atendimentos a
     INNER JOIN consultas c
       ON c.id = a.consulta_id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE a.id = $1
       AND v.usuario_id = $2
     LIMIT 1`,
    [atendimentoId, usuarioId]
  );

  return resultado.rows.length > 0;
}

export async function verificarAcessoProntuarioVeterinario(
  prontuarioId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM prontuarios p
     INNER JOIN atendimentos a
       ON a.id = p.atendimento_id
     INNER JOIN consultas c
       ON c.id = a.consulta_id
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE p.id = $1
       AND v.usuario_id = $2
     LIMIT 1`,
    [prontuarioId, usuarioId]
  );

  return resultado.rows.length > 0;
}

export async function verificarAcessoAnimalVeterinario(
  animalId: number,
  usuarioId: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT 1
     FROM consultas c
     INNER JOIN veterinarios v
       ON v.id = c.veterinario_id
     WHERE c.animal_id = $1
       AND v.usuario_id = $2
     LIMIT 1`,
    [animalId, usuarioId]
  );

  return resultado.rows.length > 0;
}