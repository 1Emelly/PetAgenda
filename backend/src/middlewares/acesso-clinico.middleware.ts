import {
  Response,
  NextFunction
} from "express";

import type {
  RequisicaoAutenticada
} from "./autenticacao.middleware.js";

import {
  buscarVeterinarioDoUsuario,
  verificarAcessoConsultaVeterinario,
  verificarAcessoAtendimentoVeterinario,
  verificarAcessoProntuarioVeterinario
} from "../services/acesso-clinico.service.js";

type RecursoClinico =
  | "consulta"
  | "atendimento"
  | "prontuario";

export function verificarAcessoClinico(
  recurso: RecursoClinico,
  parametroId: string = "id"
) {
  return async (
    req: RequisicaoAutenticada,
    res: Response,
    next: NextFunction
  ) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    if (usuario.perfil === "Administrador") {
      return next();
    }

    if (
      usuario.perfil === "Secretario" &&
      recurso === "consulta"
    ) {
      return next();
    }

    if (usuario.perfil !== "Veterinario") {
      return res.status(403).json({
        mensagem: "Acesso não autorizado."
      });
    }

    const id = Number(req.params[parametroId]);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "Identificador inválido."
      });
    }

    try {
      const veterinario = await buscarVeterinarioDoUsuario(
        usuario.id
      );

      if (!veterinario) {
        return res.status(403).json({
          mensagem:
            "Usuário não possui cadastro de veterinário vinculado."
        });
      }

      let acessoPermitido = false;

      switch (recurso) {
        case "consulta":
          acessoPermitido =
            await verificarAcessoConsultaVeterinario(
              id,
              usuario.id
            );
          break;

        case "atendimento":
          acessoPermitido =
            await verificarAcessoAtendimentoVeterinario(
              id,
              usuario.id
            );
          break;

        case "prontuario":
          acessoPermitido =
            await verificarAcessoProntuarioVeterinario(
              id,
              usuario.id
            );
          break;
      }

      if (!acessoPermitido) {
        return res.status(404).json({
          mensagem: "Registro não encontrado."
        });
      }

      return next();

    } catch (erro) {
      console.error(
        "Erro ao verificar acesso clínico:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao verificar permissões clínicas."
      });
    }
  };
}