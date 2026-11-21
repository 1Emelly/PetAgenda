import { pool } from "../config/database.js";

interface UsuarioBanco {
  id: number;
  nome: string;
  perfil: string;
  ativo: boolean;
  administrador_principal: boolean;
}

export class ErroSituacaoUsuario extends Error {
  constructor(
    mensagem: string,
    public readonly status: number
  ) {
    super(mensagem);
    this.name = "ErroSituacaoUsuario";
  }
}

export async function alterarSituacaoUsuario(
  administradorId: number,
  usuarioId: number,
  ativo: boolean
) {
  const cliente = await pool.connect();

  let transacaoIniciada = false;

  try {
    await cliente.query("BEGIN");
    transacaoIniciada = true;

    // Serializa operações administrativas sobre contas.
    await cliente.query(
      "LOCK TABLE usuarios IN SHARE ROW EXCLUSIVE MODE"
    );

    const resultadoAdministrador =
      await cliente.query<UsuarioBanco>(
        `SELECT
           id,
           nome,
           perfil,
           ativo,
           administrador_principal
         FROM usuarios
         WHERE id = $1
         FOR UPDATE`,
        [administradorId]
      );

    const administrador =
      resultadoAdministrador.rows[0];

    if (
      !administrador ||
      !administrador.ativo ||
      administrador.perfil !== "Administrador"
    ) {
      throw new ErroSituacaoUsuario(
        "Administrador não autorizado.",
        403
      );
    }

    if (administradorId === usuarioId) {
      throw new ErroSituacaoUsuario(
        "Não é permitido alterar a situação da própria conta.",
        403
      );
    }

    const resultadoUsuario =
      await cliente.query<UsuarioBanco>(
        `SELECT
           id,
           nome,
           perfil,
           ativo,
           administrador_principal
         FROM usuarios
         WHERE id = $1
         FOR UPDATE`,
        [usuarioId]
      );

    const usuario = resultadoUsuario.rows[0];

    if (!usuario) {
      throw new ErroSituacaoUsuario(
        "Usuário não encontrado.",
        404
      );
    }

    if (usuario.administrador_principal) {
      throw new ErroSituacaoUsuario(
        "Não é permitido desativar ou alterar diretamente a conta do Administrador Principal.",
        403
      );
    }

    if (
      usuario.perfil === "Administrador" &&
      !administrador.administrador_principal
    ) {
      throw new ErroSituacaoUsuario(
        "Somente o Administrador Principal pode alterar contas de outros administradores.",
        403
      );
    }

    if (usuario.ativo === ativo) {
      throw new ErroSituacaoUsuario(
        ativo
          ? "Esta conta já está ativa."
          : "Esta conta já está inativa.",
        409
      );
    }

    // Contas da equipe precisam concluir o primeiro
    // acesso por código antes da reativação administrativa.
    if (
      ativo &&
      [
        "Administrador",
        "Secretario",
        "Veterinario"
      ].includes(usuario.perfil)
    ) {
      const resultadoAtivacao =
        await cliente.query<{ ja_ativado: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM ativacoes_usuarios
             WHERE usuario_id = $1
               AND utilizado_em IS NOT NULL
           ) AS ja_ativado`,
          [usuarioId]
        );

      const jaAtivado =
        resultadoAtivacao.rows[0]?.ja_ativado === true;

      if (!jaAtivado) {
        throw new ErroSituacaoUsuario(
          "Esta conta ainda não concluiu a ativação inicial. Gere um código de ativação para que o funcionário defina sua senha.",
          409
        );
      }
    }

    const resultado = await cliente.query<UsuarioBanco>(
      `UPDATE usuarios
       SET ativo = $1
       WHERE id = $2
       RETURNING
         id,
         nome,
         perfil,
         ativo,
         administrador_principal`,
      [ativo, usuarioId]
    );

    await cliente.query("COMMIT");
    transacaoIniciada = false;

    return resultado.rows[0];
  } catch (erro) {
    if (transacaoIniciada) {
      await cliente.query("ROLLBACK");
    }

    throw erro;
  } finally {
    cliente.release();
  }
}