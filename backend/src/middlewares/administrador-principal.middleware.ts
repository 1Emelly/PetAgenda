import { Response, NextFunction } from "express";

import { pool } from "../config/database.js";

import type {
  RequisicaoAutenticada
} from "./autenticacao.middleware.js";

export async function exigirAdministradorPrincipal(
  req: RequisicaoAutenticada,
  res: Response,
  next: NextFunction
) {
  const usuario = req.usuario;

  if (!usuario) {
    return res.status(401).json({
      mensagem: "Usuário não autenticado."
    });
  }

  if (usuario.perfil !== "Administrador") {
    return res.status(403).json({
      mensagem: "Acesso exclusivo do Administrador Principal."
    });
  }

  try {
    const resultado = await pool.query<{
      administrador_principal: boolean;
    }>(
      `SELECT administrador_principal
       FROM usuarios
       WHERE id = $1
         AND perfil = 'Administrador'
         AND ativo = TRUE`,
      [usuario.id]
    );

    if (
      resultado.rows.length === 0 ||
      resultado.rows[0].administrador_principal !== true
    ) {
      return res.status(403).json({
        mensagem: "Acesso exclusivo do Administrador Principal."
      });
    }

    next();
  } catch (erro) {
    console.error(
      "Erro ao verificar Administrador Principal:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao verificar permissões administrativas."
    });
  }
}