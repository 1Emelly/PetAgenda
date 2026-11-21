import {
  Router,
  Response,
  NextFunction
} from "express";

import {
  listarAtendimentos,
  consultarAtendimento,
  consultarAtendimentoPorConsulta,
  cadastrarAtendimento,
  atualizarAtendimento
} from "../controllers/atendimento.controller.js";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import type {
  RequisicaoAutenticada
} from "../middlewares/autenticacao.middleware.js";

import {
  autorizarPerfis
} from "../middlewares/autorizacao.middleware.js";

import {
  verificarAcessoClinico
} from "../middlewares/acesso-clinico.middleware.js";

import {
  buscarVeterinarioDoUsuario,
  verificarAcessoConsultaVeterinario
} from "../services/acesso-clinico.service.js";

import {
  listarAtendimentosDoVeterinario
} from "../services/atendimentos-veterinario.service.js";

const router = Router();

router.use(autenticarToken);

router.use(
  autorizarPerfis(
    "Administrador",
    "Veterinario"
  )
);

router.get(
  "/",
  async (
    req: RequisicaoAutenticada,
    res: Response
  ) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        mensagem: "Usuário não autenticado."
      });
    }

    if (usuario.perfil === "Administrador") {
      return listarAtendimentos(req, res);
    }

    try {
      const atendimentos =
        await listarAtendimentosDoVeterinario(
          usuario.id
        );

      return res.json(atendimentos);

    } catch (erro) {
      console.error(
        "Erro ao listar atendimentos do veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar atendimentos."
      });
    }
  }
);

router.get(
  "/consulta/:consultaId",
  verificarAcessoClinico(
    "consulta",
    "consultaId"
  ),
  consultarAtendimentoPorConsulta
);

router.get(
  "/:id",
  verificarAcessoClinico("atendimento"),
  consultarAtendimento
);

router.post(
  "/",
  async (
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

    const consultaId = req.body?.consultaId;

    if (
      typeof consultaId !== "number" ||
      !Number.isSafeInteger(consultaId) ||
      consultaId <= 0
    ) {
      return res.status(400).json({
        mensagem: "ID da consulta inválido."
      });
    }

    try {
      const veterinario =
        await buscarVeterinarioDoUsuario(
          usuario.id
        );

      if (!veterinario) {
        return res.status(403).json({
          mensagem:
            "Usuário não possui cadastro de veterinário vinculado."
        });
      }

      const acessoPermitido =
        await verificarAcessoConsultaVeterinario(
          consultaId,
          usuario.id
        );

      if (!acessoPermitido) {
        return res.status(404).json({
          mensagem: "Consulta não encontrada."
        });
      }

      return next();

    } catch (erro) {
      console.error(
        "Erro ao verificar acesso para cadastrar atendimento:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao verificar permissões clínicas."
      });
    }
  },
  cadastrarAtendimento
);

router.put(
  "/:id",
  verificarAcessoClinico("atendimento"),
  atualizarAtendimento
);

export default router;