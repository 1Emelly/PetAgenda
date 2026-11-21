import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";

import { pool } from "../config/database.js";

const VALIDADE_MINUTOS = 30;
const INTERVALO_SOLICITACOES_SEGUNDOS = 60;

interface UsuarioAlteracaoEmail {
  id: number;
  email: string;
  senha_hash: string;
  ativo: boolean;
  conta_teste: boolean;
}

interface SolicitacaoAlteracaoEmail {
  id: number;
  novo_email: string;
}

interface ResultadoSolicitacao {
  mensagem: string;
  confirmacaoNecessaria: boolean;
}

export class ErroAlteracaoEmail extends Error {
  constructor(
    mensagem: string,
    public readonly status: number
  ) {
    super(mensagem);

    this.name = "ErroAlteracaoEmail";
  }
}

function gerarHash(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailReservadoParaTeste(email: string): boolean {
  const dominio = email.split("@")[1];

  return (
    typeof dominio === "string" &&
    dominio.toLowerCase().endsWith(".test")
  );
}

function ambienteDesenvolvimento(): boolean {
  return process.env.NODE_ENV === "development";
}

function criarTransporteEmail() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (
    !host ||
    !user ||
    !pass ||
    !from ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65535
  ) {
    throw new Error(
      "O serviço de e-mail não está configurado."
    );
  }

  return {
    transporte: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    }),
    remetente: from
  };
}

async function enviarCodigoEmail(
  destinatario: string,
  codigo: string
): Promise<void> {
  const {
    transporte,
    remetente
  } = criarTransporteEmail();

  await transporte.sendMail({
    from: remetente,
    to: destinatario,
    subject: "PetAgenda — Confirmação de novo e-mail",
    text: [
      "Foi solicitada uma alteração de e-mail para sua conta.",
      "",
      `Código de confirmação: ${codigo}`,
      "",
      `Este código é válido por ${VALIDADE_MINUTOS} minutos.`,
      "",
      "Se você não solicitou esta alteração, ignore esta mensagem."
    ].join("\n")
  });
}

export async function solicitarAlteracaoEmail(
  usuarioId: number,
  novoEmail: string,
  senhaAtual: string
): Promise<ResultadoSolicitacao> {
  const emailNormalizado = normalizarEmail(novoEmail);

  if (
    !emailNormalizado ||
    emailNormalizado.length > 150
  ) {
    throw new ErroAlteracaoEmail(
      "Informe um e-mail válido.",
      400
    );
  }

  const resultadoUsuario = await pool.query<UsuarioAlteracaoEmail>(
    `SELECT
       id,
       email,
       senha_hash,
       ativo,
       conta_teste
     FROM usuarios
     WHERE id = $1`,
    [usuarioId]
  );

  const usuario = resultadoUsuario.rows[0];

  if (!usuario || !usuario.ativo) {
    throw new ErroAlteracaoEmail(
      "Conta indisponível.",
      401
    );
  }

  const senhaValida = await bcrypt.compare(
    senhaAtual,
    usuario.senha_hash
  );

  if (!senhaValida) {
    throw new ErroAlteracaoEmail(
      "Senha atual incorreta.",
      403
    );
  }

  if (
    normalizarEmail(usuario.email) ===
    emailNormalizado
  ) {
    throw new ErroAlteracaoEmail(
      "O novo e-mail deve ser diferente do atual.",
      400
    );
  }

  const destinoTeste =
    emailReservadoParaTeste(emailNormalizado);

  if (
    destinoTeste &&
    (
      !usuario.conta_teste ||
      !ambienteDesenvolvimento()
    )
  ) {
    throw new ErroAlteracaoEmail(
      "Este endereço é reservado para contas de teste.",
      400
    );
  }

  const cliente = await pool.connect();

  let codigo: string | null = null;
  let codigoHash: string | null = null;

  try {
    await cliente.query("BEGIN");

    const usuarioBloqueado =
      await cliente.query<UsuarioAlteracaoEmail>(
        `SELECT
           id,
           email,
           senha_hash,
           ativo,
           conta_teste
         FROM usuarios
         WHERE id = $1
         FOR UPDATE`,
        [usuarioId]
      );

    const usuarioAtual =
      usuarioBloqueado.rows[0];

    if (!usuarioAtual || !usuarioAtual.ativo) {
      throw new ErroAlteracaoEmail(
        "Conta indisponível.",
        401
      );
    }

    // Confere novamente os dados depois do bloqueio.
    const senhaAindaValida = await bcrypt.compare(
      senhaAtual,
      usuarioAtual.senha_hash
    );

    if (!senhaAindaValida) {
      throw new ErroAlteracaoEmail(
        "Senha atual incorreta.",
        403
      );
    }

    if (
      normalizarEmail(usuarioAtual.email) ===
      emailNormalizado
    ) {
      throw new ErroAlteracaoEmail(
        "O novo e-mail deve ser diferente do atual.",
        400
      );
    }

    const alteracaoSimulada =
      usuarioAtual.conta_teste &&
      destinoTeste &&
      ambienteDesenvolvimento();

    if (
      destinoTeste &&
      !alteracaoSimulada
    ) {
      throw new ErroAlteracaoEmail(
        "Este endereço é reservado para contas de teste.",
        400
      );
    }

    const emailEmUso = await cliente.query(
      `SELECT id
       FROM usuarios
       WHERE LOWER(email) = $1
         AND id <> $2
       LIMIT 1`,
      [emailNormalizado, usuarioId]
    );

    if (emailEmUso.rowCount) {
      throw new ErroAlteracaoEmail(
        "Este e-mail já está cadastrado.",
        409
      );
    }

    // Limita novas solicitações dentro do serviço.
    // O bloqueio da linha do usuário impede que duas
    // solicitações simultâneas ignorem esse intervalo.
    const solicitacaoRecente =
      await cliente.query(
        `SELECT id
         FROM alteracoes_email
         WHERE usuario_id = $1
           AND criado_em >
             CURRENT_TIMESTAMP -
             ($2::integer * INTERVAL '1 second')
         LIMIT 1`,
        [
          usuarioId,
          INTERVALO_SOLICITACOES_SEGUNDOS
        ]
      );

    if (solicitacaoRecente.rowCount) {
      throw new ErroAlteracaoEmail(
        "Aguarde um minuto antes de solicitar outra alteração.",
        429
      );
    }

    // Invalida confirmações anteriores.
    await cliente.query(
      `UPDATE alteracoes_email
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1
         AND utilizado_em IS NULL`,
      [usuarioId]
    );

    if (alteracaoSimulada) {
      // Somente contas já marcadas como teste podem
      // trocar diretamente para o domínio reservado.
      // Nenhuma mensagem é enviada pelo Brevo.
      await cliente.query(
        `UPDATE usuarios
         SET email = $1
         WHERE id = $2`,
        [emailNormalizado, usuarioId]
      );

      await cliente.query("COMMIT");

      return {
        mensagem:
          "E-mail de teste alterado com sucesso.",
        confirmacaoNecessaria: false
      };
    }

    // Para qualquer destino não reservado, exige
    // confirmação de posse do novo endereço.
    codigo = randomBytes(32).toString("hex");
    codigoHash = gerarHash(codigo);

    await cliente.query(
      `INSERT INTO alteracoes_email (
         usuario_id,
         novo_email,
         token_hash,
         expira_em
       )
       VALUES (
         $1,
         $2,
         $3,
         CURRENT_TIMESTAMP + INTERVAL '30 minutes'
       )`,
      [
        usuarioId,
        emailNormalizado,
        codigoHash
      ]
    );

    await cliente.query("COMMIT");
  } catch (erro) {
    await cliente.query("ROLLBACK");

    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23505"
    ) {
      throw new ErroAlteracaoEmail(
        "Este e-mail já está cadastrado.",
        409
      );
    }

    throw erro;
  } finally {
    cliente.release();
  }

  if (!codigo || !codigoHash) {
    throw new Error(
      "Não foi possível preparar a confirmação."
    );
  }

  try {
    await enviarCodigoEmail(
      emailNormalizado,
      codigo
    );
  } catch (erro) {
    console.error(
      "Erro ao enviar confirmação de e-mail:",
      erro
    );

    // Se o envio falhar, invalida somente o código
    // desta solicitação, sem afetar outra mais recente.
    await pool.query(
      `UPDATE alteracoes_email
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1
         AND token_hash = $2
         AND utilizado_em IS NULL`,
      [usuarioId, codigoHash]
    );

    throw new ErroAlteracaoEmail(
      "Não foi possível enviar o código de confirmação. Tente novamente mais tarde.",
      503
    );
  }

  return {
    mensagem:
      "Enviamos um código de confirmação para o novo e-mail.",
    confirmacaoNecessaria: true
  };
}

export async function confirmarAlteracaoEmail(
  usuarioId: number,
  codigo: string
): Promise<string> {
  if (!/^[a-f0-9]{64}$/i.test(codigo)) {
    throw new ErroAlteracaoEmail(
      "Código inválido ou expirado.",
      400
    );
  }

  const codigoHash = gerarHash(codigo);

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoUsuario =
      await cliente.query<UsuarioAlteracaoEmail>(
        `SELECT
           id,
           email,
           senha_hash,
           ativo,
           conta_teste
         FROM usuarios
         WHERE id = $1
         FOR UPDATE`,
        [usuarioId]
      );

    const usuario = resultadoUsuario.rows[0];

    if (!usuario || !usuario.ativo) {
      throw new ErroAlteracaoEmail(
        "Conta indisponível.",
        401
      );
    }

    const resultadoSolicitacao =
      await cliente.query<SolicitacaoAlteracaoEmail>(
        `SELECT id, novo_email
         FROM alteracoes_email
         WHERE usuario_id = $1
           AND token_hash = $2
           AND utilizado_em IS NULL
           AND expira_em > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [usuarioId, codigoHash]
      );

    const solicitacao =
      resultadoSolicitacao.rows[0];

    if (!solicitacao) {
      throw new ErroAlteracaoEmail(
        "Código inválido ou expirado.",
        400
      );
    }

    const emailNormalizado =
      normalizarEmail(solicitacao.novo_email);

    // Códigos antigos não podem ser usados para
    // transformar uma conta em endereço de teste.
    if (emailReservadoParaTeste(emailNormalizado)) {
      throw new ErroAlteracaoEmail(
        "Este endereço é reservado para contas de teste.",
        400
      );
    }

    if (
      normalizarEmail(usuario.email) ===
      emailNormalizado
    ) {
      throw new ErroAlteracaoEmail(
        "Este e-mail já está associado à sua conta.",
        400
      );
    }

    const emailEmUso = await cliente.query(
      `SELECT id
       FROM usuarios
       WHERE LOWER(email) = $1
         AND id <> $2
       LIMIT 1`,
      [emailNormalizado, usuarioId]
    );

    if (emailEmUso.rowCount) {
      throw new ErroAlteracaoEmail(
        "Este e-mail já está cadastrado.",
        409
      );
    }

    // O endereço foi confirmado por código enviado
    // ao destinatário. A conta deixa de ser fictícia.
    await cliente.query(
      `UPDATE usuarios
       SET email = $1,
           conta_teste = FALSE
       WHERE id = $2`,
      [emailNormalizado, usuarioId]
    );

    await cliente.query(
      `UPDATE alteracoes_email
       SET utilizado_em = CURRENT_TIMESTAMP
       WHERE usuario_id = $1
         AND utilizado_em IS NULL`,
      [usuarioId]
    );

    await cliente.query("COMMIT");

    return emailNormalizado;
  } catch (erro) {
    await cliente.query("ROLLBACK");

    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23505"
    ) {
      throw new ErroAlteracaoEmail(
        "Este e-mail já está cadastrado.",
        409
      );
    }

    throw erro;
  } finally {
    cliente.release();
  }
}