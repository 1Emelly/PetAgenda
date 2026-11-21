import type {
  Request,
  Response
} from "express";

import { pool } from "../config/database.js";

import type {
  RequisicaoAutenticada
} from "../middlewares/autenticacao.middleware.js";

import {
  cadastroEquipeSchema
} from "../services/cadastro-equipe.schema.js";

import {
  cadastrarContaEquipe
} from "../services/cadastro-equipe.service.js";

export async function cadastrarUsuarioEquipe(
  req: Request,
  res: Response
) {
  const validacao = cadastroEquipeSchema.safeParse(
    req.body
  );

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados da conta inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  const requisicaoAutenticada =
    req as RequisicaoAutenticada;

  const usuarioAutenticado =
    requisicaoAutenticada.usuario;

  if (
    !usuarioAutenticado ||
    usuarioAutenticado.perfil !== "Administrador"
  ) {
    return res.status(403).json({
      mensagem:
        "Somente administradores podem cadastrar contas da equipe."
    });
  }

  try {
    const resultadoAdministrador = await pool.query<{
      administrador_principal: boolean;
    }>(
      `SELECT administrador_principal
       FROM usuarios
       WHERE id = $1
         AND perfil = 'Administrador'
         AND ativo = TRUE`,
      [usuarioAutenticado.id]
    );

    const administradorPrincipal =
      resultadoAdministrador.rows[0]
        ?.administrador_principal === true;

    // Preserva a regra existente:
    // somente o Administrador Principal pode criar
    // outras contas de Administrador.
    if (
      validacao.data.perfil === "Administrador" &&
      !administradorPrincipal
    ) {
      return res.status(403).json({
        mensagem:
          "Somente o Administrador Principal pode cadastrar outros administradores."
      });
    }

    // A classificacao de contas ficticias e restrita
    // ao Administrador Principal, em desenvolvimento.
    if (validacao.data.conta_teste === true) {
      if (
        process.env.NODE_ENV !== "development" ||
        !administradorPrincipal
      ) {
        return res.status(403).json({
          mensagem:
            "O cadastro de contas fictícias está disponível " +
            "somente para o Administrador Principal " +
            "no ambiente de desenvolvimento."
        });
      }
    }

    const usuario = await cadastrarContaEquipe({
      ...validacao.data,
      conta_teste: validacao.data.conta_teste === true
    });

    return res.status(201).json({
      mensagem:
        "Conta criada com sucesso. " +
        "O usuário deverá concluir a ativação " +
        "antes de acessar o sistema.",
      usuario
    });
  } catch (erro: unknown) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23505"
    ) {
      return res.status(409).json({
        mensagem:
          "Já existe uma conta cadastrada com este e-mail."
      });
    }

    console.error(
      "Erro ao cadastrar conta da equipe:",
      erro
    );

    return res.status(500).json({
      mensagem:
        "Erro interno ao cadastrar conta da equipe."
    });
  }
}