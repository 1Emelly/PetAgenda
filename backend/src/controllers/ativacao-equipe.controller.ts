import type { Request, Response } from "express";

import { z } from "zod";

import {
  gerarAtivacaoEquipe,
  concluirAtivacaoEquipe
} from "../services/ativacao-equipe.service.js";

const gerarSchema = z.object({
  usuarioId: z.number().int().positive()
});

const concluirSchema = z.object({
  token: z.string().length(64),
  senha: z.string().min(12)
});

export async function gerarCodigoAtivacao(
  req: Request,
  res: Response
) {
  const validacao = gerarSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Informe um usuário válido."
    });
  }

  try {
    const token = await gerarAtivacaoEquipe(
      validacao.data.usuarioId
    );

    return res.status(201).json({
      mensagem: "Código de ativação gerado com sucesso.",
      token,
      expiraEmMinutos: 30
    });
  } catch (erro) {
    const mensagem = erro instanceof Error
      ? erro.message
      : "Erro ao gerar código de ativação.";

    if (
        mensagem === "Usuário não encontrado." ||
        mensagem === "A conta já está ativa." ||
        mensagem.startsWith("A ativação administrativa") ||
        mensagem.startsWith("Esta conta já concluiu")
    ) {
      return res.status(400).json({ mensagem });
    }

    console.error("Erro ao gerar ativação:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao gerar ativação."
    });
  }
}

export async function ativarContaEquipe(
  req: Request,
  res: Response
) {
  const validacao = concluirSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem:
        "Informe um código válido e uma senha com pelo menos 12 caracteres."
    });
  }

  try {
    await concluirAtivacaoEquipe(
      validacao.data.token,
      validacao.data.senha
    );

    return res.json({
      mensagem:
        "Conta ativada com sucesso. Você já pode entrar."
    });
  } catch (erro) {
    const mensagem = erro instanceof Error
      ? erro.message
      : "Erro ao ativar conta.";

    if (
      mensagem === "Código de ativação inválido ou expirado."
    ) {
      return res.status(400).json({ mensagem });
    }

    console.error("Erro ao ativar conta:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao ativar conta."
    });
  }
}