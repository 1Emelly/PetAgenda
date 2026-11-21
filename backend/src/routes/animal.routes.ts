import {
  Router,
  Response,
  NextFunction
} from "express";

import {
  listarAnimais,
  cadastrarAnimal,
  consultarAnimal,
  editarAnimal,
  removerAnimal
} from "../controllers/animal.controller.js";

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
  buscarVeterinarioDoUsuario,
  verificarAcessoAnimalVeterinario
} from "../services/acesso-clinico.service.js";

import {
  listarAnimaisDoVeterinario
} from "../services/animais-veterinario.service.js";

const animalRoutes = Router();

animalRoutes.use(autenticarToken);

animalRoutes.use(
  autorizarPerfis(
    "Administrador",
    "Secretario",
    "Veterinario"
  )
);

animalRoutes.get(
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

    if (usuario.perfil !== "Veterinario") {
      return listarAnimais(req, res);
    }

    try {
      const veterinario =
        await buscarVeterinarioDoUsuario(usuario.id);

      if (!veterinario) {
        return res.status(403).json({
          mensagem:
            "Usuário não possui cadastro de veterinário vinculado."
        });
      }

      const animais =
        await listarAnimaisDoVeterinario(usuario.id);

      return res.json(animais);
    } catch (erro) {
      console.error(
        "Erro ao listar animais do veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar animais."
      });
    }
  }
);

animalRoutes.post(
  "/",
  autorizarPerfis(
    "Administrador",
    "Secretario"
  ),
  cadastrarAnimal
);

animalRoutes.get(
  "/:id",
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

    if (usuario.perfil !== "Veterinario") {
      return next();
    }

    const animalId = Number(req.params.id);

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
        await buscarVeterinarioDoUsuario(usuario.id);

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

      return next();
    } catch (erro) {
      console.error(
        "Erro ao verificar acesso ao animal:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao verificar permissões."
      });
    }
  },
  consultarAnimal
);

animalRoutes.put(
  "/:id",
  autorizarPerfis(
    "Administrador",
    "Secretario"
  ),
  editarAnimal
);

animalRoutes.delete(
  "/:id",
  autorizarPerfis(
    "Administrador",
    "Secretario"
  ),
  removerAnimal
);

export default animalRoutes;