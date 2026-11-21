import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import {
  usuarioSchema,
  loginSchema
} from "../services/usuario.schema.js";

import {
  cadastrarNovoUsuario,
  buscarUsuarioPorEmail,
  verificarSenha
} from "../services/usuario.service.js";

function obterCodigoErro(erro: unknown): string | undefined {
  if (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro
  ) {
    return String(erro.code);
  }

  return undefined;
}

export async function cadastrarUsuario(
  req: Request,
  res: Response
) {
  const validacao = usuarioSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do usuário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

    if (validacao.data.perfil !== "Tutor") {
    return res.status(403).json({
      mensagem:
        "O cadastro público permite apenas usuários com perfil Tutor."
    });
  }

  try {
    const usuarioExistente = await buscarUsuarioPorEmail(
      validacao.data.email
    );

    if (usuarioExistente) {
      return res.status(409).json({
        mensagem: "Já existe um usuário cadastrado com este e-mail."
      });
    }

    const novoUsuario = await cadastrarNovoUsuario(
      validacao.data
    );

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: novoUsuario
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "23505") {
      return res.status(409).json({
        mensagem: "Já existe um usuário cadastrado com este e-mail."
      });
    }

    console.error("Erro ao cadastrar usuário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar usuário."
    });
  }
}

export async function realizarLogin(
  req: Request,
  res: Response
) {
  const validacao = loginSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados de login inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const usuario = await buscarUsuarioPorEmail(
      validacao.data.email
    );

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const senhaCorreta = await verificarSenha(
      validacao.data.senha,
      usuario.senha
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res.status(500).json({
        mensagem:
          "A chave de autenticação não está configurada."
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        perfil: usuario.perfil
      },
      JWT_SECRET,
      {
        expiresIn: "8h"
      }
    );

    return res.json({
      mensagem: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      }
    });
  } catch (erro) {
    console.error("Erro ao realizar login:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao realizar login."
    });
  }
}