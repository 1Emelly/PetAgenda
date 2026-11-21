import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

import { pool } from "../config/database.js";

function gerarHashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function gerarAtivacaoEquipe(
  usuarioId: number
): Promise<string> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query<{
      id: number;
      ativo: boolean;
      perfil: string;
    }>(
      `SELECT id, ativo, perfil
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuarioId]
    );

    const usuario = resultado.rows[0];

    if (!usuario) {
      throw new Error("Usuário não encontrado.");
    }

    if (usuario.ativo) {
      throw new Error("A conta já está ativa.");
    }

    if (![
      "Administrador",
      "Secretario",
      "Veterinario"
    ].includes(usuario.perfil)) {
      throw new Error(
        "A ativação administrativa não está disponível para este perfil."
      );
    }

    const resultadoAtivacao = await cliente.query<{
      ja_ativado: boolean;
    }>(
      `SELECT EXISTS (
         SELECT 1
         FROM ativacoes_usuarios
         WHERE usuario_id = $1
           AND utilizado_em IS NOT NULL
       ) AS ja_ativado`,
      [usuarioId]
    );

    if (resultadoAtivacao.rows[0]?.ja_ativado === true) {
      throw new Error(
        "Esta conta já concluiu a ativação inicial. Utilize a reativação administrativa."
      );
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = gerarHashToken(token);

    await cliente.query(
      `DELETE FROM ativacoes_usuarios
       WHERE usuario_id = $1
         AND utilizado_em IS NULL`,
      [usuarioId]
    );

    await cliente.query(
      `INSERT INTO ativacoes_usuarios (
        usuario_id,
        token_hash,
        expira_em
      )
      VALUES (
        $1,
        $2,
        CURRENT_TIMESTAMP + INTERVAL '30 minutes'
      )`,
      [usuarioId, tokenHash]
    );

    await cliente.query("COMMIT");

    return token;
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function concluirAtivacaoEquipe(
  token: string,
  senha: string
): Promise<void> {
  const tokenHash = gerarHashToken(token);

  const senhaHash = await bcrypt.hash(senha, 12);

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query<{
      id: number;
      usuario_id: number;
    }>(
      `SELECT
        a.id,
        a.usuario_id
       FROM ativacoes_usuarios a
       INNER JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.token_hash = $1
         AND a.utilizado_em IS NULL
         AND a.expira_em > CURRENT_TIMESTAMP
         AND u.ativo = FALSE
         AND u.perfil IN (
           'Administrador',
           'Secretario',
           'Veterinario'
         )
       FOR UPDATE OF a, u`,
      [tokenHash]
    );

    const ativacao = resultado.rows[0];

    if (!ativacao) {
      throw new Error(
        "Código de ativação inválido ou expirado."
      );
    }

    const resultadoAtivacao = await cliente.query<{
      ja_ativado: boolean;
    }>(
      `SELECT EXISTS (
         SELECT 1
         FROM ativacoes_usuarios
         WHERE usuario_id = $1
           AND utilizado_em IS NOT NULL
       ) AS ja_ativado`,
      [ativacao.usuario_id]
    );

    if (resultadoAtivacao.rows[0]?.ja_ativado === true) {
      throw new Error(
        "Código de ativação inválido ou expirado."
      );
    }

    await cliente.query(
      `UPDATE usuarios
       SET senha_hash = $1,
           ativo = TRUE
       WHERE id = $2`,
      [senhaHash, ativacao.usuario_id]
    );

    await cliente.query(
      `UPDATE ativacoes_usuarios
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [ativacao.id]
    );

    await cliente.query("COMMIT");
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}