import type { Request, Response } from "express";
import { z } from "zod";

import {
  solicitarRecuperacaoSenha,
  redefinirSenha,
  ErroRecuperacaoSenha
} from "../services/recuperacao-senha.service.js";

const solicitarSchema = z.object({
  email: z.email()
});

const redefinirSchema = z.object({
  codigo: z.string().regex(/^[a-f0-9]{64}$/),
  novaSenha: z.string().min(9).max(128)
});

export async function solicitarCodigoRecuperacao(
  req: Request,
  res: Response
) {
  const validacao = solicitarSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Informe um e-mail válido."
    });
  }

  try {
    await solicitarRecuperacaoSenha(
      validacao.data.email
    );

    return res.json({
      mensagem:
        "Se o e-mail estiver cadastrado e a conta estiver ativa, " +
        "você receberá um código de recuperação."
    });
  } catch (erro) {
    console.error(
      "Erro ao solicitar recuperação de senha:",
      erro instanceof Error ? erro.message : "Erro desconhecido"
    );

    return res.status(503).json({
      mensagem:
        "O serviço de recuperação está temporariamente indisponível."
    });
  }
}

export async function confirmarNovaSenha(
  req: Request,
  res: Response
) {
  const validacao = redefinirSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem:
        "Informe um código válido e uma senha de 9 a 128 caracteres."
    });
  }

  try {
    await redefinirSenha(
      validacao.data.codigo,
      validacao.data.novaSenha
    );

    return res.json({
      mensagem:
        "Senha redefinida com sucesso. Entre com sua nova senha."
    });
  } catch (erro) {
    if (erro instanceof ErroRecuperacaoSenha) {
      return res.status(erro.status).json({
        mensagem: erro.message
      });
    }

    console.error(
      "Erro ao redefinir senha:",
      erro instanceof Error ? erro.message : "Erro desconhecido"
    );

    return res.status(500).json({
      mensagem: "Não foi possível redefinir a senha."
    });
  }
}