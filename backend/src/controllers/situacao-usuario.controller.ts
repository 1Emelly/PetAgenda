import type {
  Request,
  Response
} from "express";

import { z } from "zod";

import type {
  RequisicaoAutenticada
} from "../middlewares/autenticacao.middleware.js";

import {
  alterarSituacaoUsuario,
  ErroSituacaoUsuario
} from "../services/situacao-usuario.service.js";

const situacaoUsuarioSchema = z.object({
  ativo: z.boolean()
});

export async function atualizarSituacaoUsuario(
  req: Request,
  res: Response
) {
  const requisicao =
    req as RequisicaoAutenticada;

  const administradorId =
    requisicao.usuario?.id;

  if (!administradorId) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  const usuarioId = Number(req.params.id);

  if (
    !Number.isSafeInteger(usuarioId) ||
    usuarioId <= 0
  ) {
    return res.status(400).json({
      mensagem: "Identificador de usuário inválido."
    });
  }

  const validacao = situacaoUsuarioSchema.safeParse(
    req.body
  );

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Informe uma situação válida para a conta."
    });
  }

  try {
    const usuario = await alterarSituacaoUsuario(
      administradorId,
      usuarioId,
      validacao.data.ativo
    );

    return res.json({
      mensagem: usuario.ativo
        ? "Conta reativada com sucesso."
        : "Conta desativada com sucesso.",
      usuario
    });
  } catch (erro) {
    if (erro instanceof ErroSituacaoUsuario) {
      return res.status(erro.status).json({
        mensagem: erro.message
      });
    }

    console.error(
      "Erro ao alterar situação do usuário:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao alterar a situação da conta."
    });
  }
}