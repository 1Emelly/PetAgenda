import { Response, NextFunction } from "express";

import {
  RequisicaoAutenticada,
  UsuarioToken
} from "./autenticacao.middleware.js";

type Perfil = UsuarioToken["perfil"];

export function autorizarPerfis(...perfisPermitidos: Perfil[]) {
  return (
    req: RequisicaoAutenticada,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        mensagem:
          "Você não possui permissão para acessar este recurso."
      });
    }

    next();
  };
}