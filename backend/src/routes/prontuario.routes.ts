import {
  Router,
  Response,
  NextFunction
} from "express";

import {
  listarProntuarios,
  consultarProntuario,
  consultarProntuariosPorAnimal,
  consultarProntuarioPorAtendimento,
  cadastrarProntuario,
  atualizarProntuario
} from "../controllers/prontuario.controller.js";

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
  verificarAcessoAtendimentoVeterinario,
  verificarAcessoAnimalVeterinario
} from "../services/acesso-clinico.service.js";

import {
  listarProntuariosDoVeterinario,
  listarProntuariosDoAnimalPorVeterinario
} from "../services/prontuarios-veterinario.service.js";

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
      return listarProntuarios(req, res);
    }

    try {
      const prontuarios =
        await listarProntuariosDoVeterinario(
          usuario.id
        );

      return res.json(prontuarios);

    } catch (erro) {
      console.error(
        "Erro ao listar prontuários do veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar prontuários."
      });
    }
  }
);

router.get(
  "/animal/:animalId",
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
      return consultarProntuariosPorAnimal(req, res);
    }

    const animalId = Number(req.params.animalId);

    if (
      !Number.isSafeInteger(animalId) ||
      animalId <= 0
    ) {
      return res.status(400).json({
        mensagem: "ID do animal inválido."
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
        await verificarAcessoAnimalVeterinario(
          animalId,
          usuario.id
        );

      if (!acessoPermitido) {
        return res.status(404).json({
          mensagem: "Animal não encontrado."
        });
      }

      const prontuarios =
        await listarProntuariosDoAnimalPorVeterinario(
          animalId,
          usuario.id
        );

      return res.json(prontuarios);

    } catch (erro) {
      console.error(
        "Erro ao consultar prontuários do animal:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao consultar prontuários."
      });
    }
  }
);

router.get(
  "/atendimento/:atendimentoId",
  verificarAcessoClinico(
    "atendimento",
    "atendimentoId"
  ),
  consultarProntuarioPorAtendimento
);

router.get(
  "/:id",
  verificarAcessoClinico("prontuario"),
  consultarProntuario
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

    const atendimentoId = req.body?.atendimentoId;

    if (
      typeof atendimentoId !== "number" ||
      !Number.isSafeInteger(atendimentoId) ||
      atendimentoId <= 0
    ) {
      return res.status(400).json({
        mensagem: "ID do atendimento inválido."
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
        await verificarAcessoAtendimentoVeterinario(
          atendimentoId,
          usuario.id
        );

      if (!acessoPermitido) {
        return res.status(404).json({
          mensagem: "Atendimento não encontrado."
        });
      }

      return next();

    } catch (erro) {
      console.error(
        "Erro ao verificar acesso para cadastrar prontuário:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao verificar permissões clínicas."
      });
    }
  },
  cadastrarProntuario
);

router.put(
  "/:id",
  verificarAcessoClinico("prontuario"),
  atualizarProntuario
);

export default router;