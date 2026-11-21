import type { Request, Response } from "express";

import { z } from "zod";

import type {
  RequisicaoAutenticada
} from "../middlewares/autenticacao.middleware.js";

import {
  solicitarAlteracaoEmail,
  confirmarAlteracaoEmail,
  ErroAlteracaoEmail
} from "../services/alteracao-email.service.js";

const solicitarSchema = z.object({
  novoEmail: z.email("Informe um e-mail válido.")
    .trim()
    .toLowerCase(),

  senhaAtual: z.string()
    .min(1, "Informe sua senha atual.")
});

const confirmarSchema = z.object({
  codigo: z.string()
    .length(64, "Informe um código de confirmação válido.")
});

export async function solicitarMudancaEmail(
  req: Request,
  res: Response
) {
  const validacao = solicitarSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  const requisicaoAutenticada =
    req as RequisicaoAutenticada;

  const usuarioId = requisicaoAutenticada.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  try {
    const resultado = await solicitarAlteracaoEmail(
      usuarioId,
      validacao.data.novoEmail,
      validacao.data.senhaAtual
    );

    return res.json(resultado);
  } catch (erro) {
    if (erro instanceof ErroAlteracaoEmail) {
      return res.status(erro.status).json({
        mensagem: erro.message
      });
    }

    console.error(
      "Erro ao solicitar alteração de e-mail:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao solicitar alteração de e-mail."
    });
  }
}

export async function confirmarMudancaEmail(
  req: Request,
  res: Response
) {
  const validacao = confirmarSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Informe um código de confirmação válido."
    });
  }

  const requisicaoAutenticada =
    req as RequisicaoAutenticada;

  const usuarioId = requisicaoAutenticada.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  try {
    const novoEmail = await confirmarAlteracaoEmail(
      usuarioId,
      validacao.data.codigo
    );

    return res.json({
      mensagem: "E-mail alterado com sucesso.",
      email: novoEmail
    });
  } catch (erro) {
    if (erro instanceof ErroAlteracaoEmail) {
      return res.status(erro.status).json({
        mensagem: erro.message
      });
    }

    console.error(
      "Erro ao confirmar alteração de e-mail:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao confirmar alteração de e-mail."
    });
  }
}