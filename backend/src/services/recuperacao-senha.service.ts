import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

import { pool } from "../config/database.js";

const VALIDADE_MINUTOS = 30;

function gerarHash(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

// =====================================================
// RECUPERACAO DE SENHA - CONTAS FICTICIAS DE TESTE
// =====================================================

// A simulacao somente funciona no ambiente de desenvolvimento.
// Contas reais continuam utilizando o envio pela Brevo.
function modoRecuperacaoTesteAtivo(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.DEV_RECOVERY_ENABLED === "true"
  );
}

function obterConfiguracaoEmail() {
  const host = process.env.SMTP_HOST;
  const porta = Number(process.env.SMTP_PORT || 587);
  const usuario = process.env.SMTP_USER;
  const senha = process.env.SMTP_PASSWORD;
  const remetente = process.env.SMTP_FROM;

  if (
    !host ||
    !usuario ||
    !senha ||
    !remetente ||
    !Number.isInteger(porta) ||
    porta <= 0 ||
    porta > 65535
  ) {
    throw new Error(
      "O serviço de envio de e-mails não está configurado."
    );
  }

  return {
    host,
    porta,
    usuario,
    senha,
    remetente
  };
}

async function enviarEmailRecuperacao(
  destinatario: string,
  codigo: string
): Promise<void> {
  const configuracao = obterConfiguracaoEmail();

  const transporte = nodemailer.createTransport({
    host: configuracao.host,
    port: configuracao.porta,
    secure: configuracao.porta === 465,
    auth: {
      user: configuracao.usuario,
      pass: configuracao.senha
    }
  });

  await transporte.sendMail({
    from: configuracao.remetente,
    to: destinatario,
    subject: "PetAgenda — Recuperação de senha",
    text: [
      "Você solicitou a recuperação da senha do PetAgenda.",
      "",
      `Código de recuperação: ${codigo}`,
      "",
      `Este código é válido por ${VALIDADE_MINUTOS} minutos.`,
      "",
      "Se você não solicitou a recuperação, ignore esta mensagem."
    ].join("\n")
  });
}

export async function solicitarRecuperacaoSenha(
  email: string
): Promise<void> {
  const emailNormalizado = email.trim().toLowerCase();

  const resultado = await pool.query<{
    id: number;
    email: string;
    ativo: boolean;
    conta_teste: boolean;
  }>(
    `SELECT id, email, ativo, conta_teste
     FROM usuarios
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [emailNormalizado]
  );

  const usuario = resultado.rows[0];

  // A resposta publica permanece igual para contas
  // inexistentes ou desativadas.
  if (!usuario || !usuario.ativo) {
    return;
  }

  // Contas identificadas como ficticias nunca devem
  // receber e-mails reais de recuperacao.
  if (usuario.conta_teste === true) {
    if (modoRecuperacaoTesteAtivo()) {
      // Simulacao academica:
      // nao envia e-mail e nao gera codigo de recuperacao.
      // A resposta publica continua generica.
      console.log(
        "PetAgenda Faculdade: solicitacao de recuperacao " +
        "simulada para uma conta de teste."
      );
    }

    return;
  }

  // Contas reais continuam utilizando a Brevo.
  const configuracao = obterConfiguracaoEmail();
  void configuracao;

  const cliente = await pool.connect();

  let codigo: string | null = null;

  try {
    await cliente.query("BEGIN");

    // Evita solicitacoes simultaneas para a mesma conta.
    await cliente.query(
      `SELECT id
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuario.id]
    );

    const resultadoRecente = await cliente.query<{
      existe: boolean;
    }>(
      `SELECT EXISTS (
         SELECT 1
         FROM recuperacoes_senha
         WHERE usuario_id = $1
           AND criado_em >
             CURRENT_TIMESTAMP - INTERVAL '60 seconds'
       ) AS existe`,
      [usuario.id]
    );

    if (resultadoRecente.rows[0]?.existe === true) {
      await cliente.query("COMMIT");
      return;
    }

    codigo = randomBytes(32).toString("hex");

    await cliente.query(
      `UPDATE recuperacoes_senha
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1
         AND utilizado_em IS NULL`,
      [usuario.id]
    );

    await cliente.query(
      `INSERT INTO recuperacoes_senha (
         usuario_id,
         token_hash,
         expira_em
       )
       VALUES (
         $1,
         $2,
         CURRENT_TIMESTAMP + INTERVAL '30 minutes'
       )`,
      [usuario.id, gerarHash(codigo)]
    );

    await cliente.query("COMMIT");
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }

  if (codigo) {
    await enviarEmailRecuperacao(
      usuario.email,
      codigo
    );
  }
}

export class ErroRecuperacaoSenha extends Error {
  constructor(
    mensagem: string,
    public readonly status: number
  ) {
    super(mensagem);
    this.name = "ErroRecuperacaoSenha";
  }
}

export async function redefinirSenha(
  codigo: string,
  novaSenha: string
): Promise<void> {
  const tokenHash = gerarHash(codigo);
  const cliente = await pool.connect();

  let transacaoIniciada = false;

  try {
    await cliente.query("BEGIN");
    transacaoIniciada = true;

    const resultadoCodigo = await cliente.query<{
      id: number;
      usuario_id: number;
    }>(
      `SELECT id, usuario_id
       FROM recuperacoes_senha
       WHERE token_hash = $1`,
      [tokenHash]
    );

    const registro = resultadoCodigo.rows[0];

    if (!registro) {
      throw new ErroRecuperacaoSenha(
        "Código inválido ou expirado.",
        400
      );
    }

    const resultadoUsuario = await cliente.query<{
      id: number;
      ativo: boolean;
      conta_teste: boolean;
    }>(
      `SELECT id, ativo, conta_teste
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [registro.usuario_id]
    );

    const usuario = resultadoUsuario.rows[0];

    if (
      !usuario ||
      !usuario.ativo ||
      usuario.conta_teste === true
    ) {
      throw new ErroRecuperacaoSenha(
        "Código inválido ou expirado.",
        400
      );
    }

    const resultadoValido = await cliente.query<{
      id: number;
    }>(
      `SELECT id
       FROM recuperacoes_senha
       WHERE id = $1
         AND utilizado_em IS NULL
         AND expira_em > CURRENT_TIMESTAMP
       FOR UPDATE`,
      [registro.id]
    );

    if (!resultadoValido.rows[0]) {
      throw new ErroRecuperacaoSenha(
        "Código inválido ou expirado.",
        400
      );
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    await cliente.query(
      `UPDATE usuarios
       SET senha_hash = $1
       WHERE id = $2`,
      [senhaHash, usuario.id]
    );

    await cliente.query(
      `UPDATE recuperacoes_senha
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1
         AND utilizado_em IS NULL`,
      [usuario.id]
    );

    await cliente.query("COMMIT");
    transacaoIniciada = false;
  } catch (erro) {
    if (transacaoIniciada) {
      await cliente.query("ROLLBACK");
    }

    throw erro;
  } finally {
    cliente.release();
  }
}