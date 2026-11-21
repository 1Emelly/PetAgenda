import { pool } from "../config/database.js";

export interface VinculoTutor {
  tutorId: number;
  usuarioId: number;
}

export type ResultadoVinculacao =
  | { tipo: "sucesso"; vinculo: VinculoTutor }
  | { tipo: "tutor_nao_encontrado" }
  | { tipo: "usuario_nao_encontrado" }
  | { tipo: "usuario_invalido" }
  | { tipo: "tutor_ja_vinculado" }
  | { tipo: "usuario_ja_vinculado" };

export async function vincularUsuarioAoTutor(
  tutorId: number,
  usuarioId: number
): Promise<ResultadoVinculacao> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Bloqueia o usuário durante a operação para impedir
    // vínculos concorrentes com outros cadastros.
    const resultadoUsuario = await cliente.query<{
      id: number;
      perfil: string;
      ativo: boolean;
    }>(
      `SELECT id, perfil, ativo
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuarioId]
    );

    const usuario = resultadoUsuario.rows[0];

    if (!usuario) {
      await cliente.query("ROLLBACK");

      return {
        tipo: "usuario_nao_encontrado"
      };
    }

    if (
      usuario.perfil !== "Tutor" ||
      !usuario.ativo
    ) {
      await cliente.query("ROLLBACK");

      return {
        tipo: "usuario_invalido"
      };
    }

    const resultadoTutor = await cliente.query<{
      id: number;
      usuario_id: number | null;
    }>(
      `SELECT id, usuario_id
       FROM tutores
       WHERE id = $1
       FOR UPDATE`,
      [tutorId]
    );

    const tutor = resultadoTutor.rows[0];

    if (!tutor) {
      await cliente.query("ROLLBACK");

      return {
        tipo: "tutor_nao_encontrado"
      };
    }

    if (tutor.usuario_id !== null) {
      await cliente.query("ROLLBACK");

      return {
        tipo: "tutor_ja_vinculado"
      };
    }

    const vinculoExistente = await cliente.query(
      `SELECT id
       FROM tutores
       WHERE usuario_id = $1
       LIMIT 1`,
      [usuarioId]
    );

    if (vinculoExistente.rows.length > 0) {
      await cliente.query("ROLLBACK");

      return {
        tipo: "usuario_ja_vinculado"
      };
    }

    await cliente.query(
      `UPDATE tutores
       SET usuario_id = $1
       WHERE id = $2`,
      [usuarioId, tutorId]
    );

    await cliente.query("COMMIT");

    return {
      tipo: "sucesso",
      vinculo: {
        tutorId,
        usuarioId
      }
    };
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function consultarVinculoTutor(
  tutorId: number
): Promise<{
  tutorId: number;
  usuarioId: number | null;
} | undefined> {
  const resultado = await pool.query<{
    id: number;
    usuario_id: number | null;
  }>(
    `SELECT id, usuario_id
     FROM tutores
     WHERE id = $1`,
    [tutorId]
  );

  const tutor = resultado.rows[0];

  if (!tutor) {
    return undefined;
  }

  return {
    tutorId: tutor.id,
    usuarioId: tutor.usuario_id
  };
}

export async function removerVinculoTutor(
  tutorId: number
): Promise<
  "removido" |
  "tutor_nao_encontrado" |
  "sem_vinculo"
> {
  const resultado = await pool.query<{
    id: number;
  }>(
    `UPDATE tutores
     SET usuario_id = NULL
     WHERE id = $1
       AND usuario_id IS NOT NULL
     RETURNING id`,
    [tutorId]
  );

  if (resultado.rows.length > 0) {
    return "removido";
  }

  const tutor = await consultarVinculoTutor(tutorId);

  if (!tutor) {
    return "tutor_nao_encontrado";
  }

  return "sem_vinculo";
}