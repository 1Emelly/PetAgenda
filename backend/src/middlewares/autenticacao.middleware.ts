import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { buscarUsuarioPorId } from "../services/usuario.service.js";

export interface UsuarioToken extends JwtPayload {
  id: number;
  perfil: "Administrador" | "Secretario" | "Veterinario" | "Tutor";
}

export interface RequisicaoAutenticada extends Request {
  usuario?: UsuarioToken;
}

export async function autenticarToken(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction
) {
  const autorizacao = req.headers.authorization;

  if (!autorizacao) {
    return res.status(401).json({
      mensagem: "Token de autenticação não informado."
    });
  }

  const partes = autorizacao.split(" ");

  if (
    partes.length !== 2 ||
    partes[0] !== "Bearer" ||
    !partes[1]
  ) {
    return res.status(401).json({
      mensagem: "Formato de autenticação inválido."
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return res.status(500).json({
      mensagem: "A chave de autenticação não está configurada."
    });
  }

  try {
    const token = partes[1];

    const dados = jwt.verify(
      token,
      JWT_SECRET,
      {
        algorithms: ["HS256"]
      }
    );

    if (
      typeof dados === "string" ||
      typeof dados.id !== "number" ||
      !Number.isSafeInteger(dados.id) ||
      dados.id <= 0
    ) {
      return res.status(401).json({
        mensagem: "Token inválido."
      });
    }

    const usuario = await buscarUsuarioPorId(dados.id);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        mensagem: "Usuário não encontrado ou inativo."
      });
    }

    if (
      ![
        "Administrador",
        "Secretario",
        "Veterinario",
        "Tutor"
      ].includes(usuario.perfil)
    ) {
      return res.status(403).json({
        mensagem: "Perfil de usuário inválido."
      });
    }

    req.usuario = {
      id: usuario.id,
      perfil: usuario.perfil
    };

    next();
  } catch (erro) {
    if (erro instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        mensagem: "Token inválido ou expirado."
      });
    }

    console.error("Erro ao autenticar usuário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao autenticar usuário."
    });
  }
}