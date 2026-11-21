import {
  Router,
  Response,
  NextFunction
} from "express";

import {
  listarTutores,
  cadastrarTutor,
  consultarTutor,
  editarTutor,
  removerTutor
} from "../controllers/tutor.controller.js";

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
  buscarVeterinarioDoUsuario
} from "../services/acesso-clinico.service.js";

import {
  listarTutoresDoVeterinario,
  verificarAcessoTutorVeterinario
} from "../services/tutores-veterinario.service.js";

import {
  buscarTutorDoUsuario,
  verificarAcessoAnimalTutor,
  verificarAcessoConsultaTutor
} from "../services/acesso-tutor.service.js";

import {
  listarAnimaisDoTutor
} from "../services/animais-tutor.service.js";

import {
  listarConsultasDoTutor
} from "../services/consultas-tutor.service.js";

import {
  buscarTutorPorId
} from "../services/tutor.service.js";

import {
  buscarAnimalPorId
} from "../services/animal.service.js";

import {
  buscarConsultaPorId
} from "../services/consulta.service.js";

const tutorRoutes = Router();

tutorRoutes.use(autenticarToken);

// Rotas exclusivas do tutor autenticado.
// Devem permanecer antes da restrição administrativa
// e da rota dinâmica /:id.

tutorRoutes.get(
  "/me",
  autorizarPerfis("Tutor"),
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

    try {
      const vinculo = await buscarTutorDoUsuario(
        usuario.id
      );

      if (!vinculo) {
        return res.status(404).json({
          mensagem: "Cadastro de tutor não vinculado ao usuário."
        });
      }

      const tutor = await buscarTutorPorId(
        vinculo.id
      );

      if (!tutor) {
        return res.status(404).json({
          mensagem: "Tutor não encontrado."
        });
      }

      return res.json(tutor);
    } catch (erro) {
      console.error(
        "Erro ao consultar cadastro do tutor:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao consultar tutor."
      });
    }
  }
);

tutorRoutes.get(
  "/me/animais",
  autorizarPerfis("Tutor"),
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

    try {
      const vinculo = await buscarTutorDoUsuario(
        usuario.id
      );

      if (!vinculo) {
        return res.status(404).json({
          mensagem: "Cadastro de tutor não vinculado ao usuário."
        });
      }

      const animais = await listarAnimaisDoTutor(
        usuario.id
      );

      return res.json(animais);
    } catch (erro) {
      console.error(
        "Erro ao listar animais do tutor:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar animais."
      });
    }
  }
);

tutorRoutes.get(
  "/me/animais/:id",
  autorizarPerfis("Tutor"),
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
      const vinculo = await buscarTutorDoUsuario(
        usuario.id
      );

      if (!vinculo) {
        return res.status(404).json({
          mensagem: "Cadastro de tutor não vinculado ao usuário."
        });
      }

      const permitido = await verificarAcessoAnimalTutor(
        animalId,
        usuario.id
      );

      if (!permitido) {
        return res.status(404).json({
          mensagem: "Animal não encontrado."
        });
      }

      const animal = await buscarAnimalPorId(
        animalId
      );

      if (!animal) {
        return res.status(404).json({
          mensagem: "Animal não encontrado."
        });
      }

      return res.json(animal);
    } catch (erro) {
      console.error(
        "Erro ao consultar animal do tutor:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao consultar animal."
      });
    }
  }
);

tutorRoutes.get(
  "/me/consultas",
  autorizarPerfis("Tutor"),
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

    try {
      const vinculo = await buscarTutorDoUsuario(
        usuario.id
      );

      if (!vinculo) {
        return res.status(404).json({
          mensagem: "Cadastro de tutor não vinculado ao usuário."
        });
      }

      const consultas = await listarConsultasDoTutor(
        usuario.id
      );

      return res.json(consultas);
    } catch (erro) {
      console.error(
        "Erro ao listar consultas do tutor:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar consultas."
      });
    }
  }
);

tutorRoutes.get(
  "/me/consultas/:id",
  autorizarPerfis("Tutor"),
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

    const consultaId = Number(req.params.id);

    if (
      !Number.isSafeInteger(consultaId) ||
      consultaId <= 0
    ) {
      return res.status(400).json({
        mensagem: "ID da consulta inválido."
      });
    }

    try {
      const vinculo = await buscarTutorDoUsuario(
        usuario.id
      );

      if (!vinculo) {
        return res.status(404).json({
          mensagem: "Cadastro de tutor não vinculado ao usuário."
        });
      }

      const permitido = await verificarAcessoConsultaTutor(
        consultaId,
        usuario.id
      );

      if (!permitido) {
        return res.status(404).json({
          mensagem: "Consulta não encontrada."
        });
      }

      const consulta = await buscarConsultaPorId(
        consultaId
      );

      if (!consulta) {
        return res.status(404).json({
          mensagem: "Consulta não encontrada."
        });
      }

      return res.json(consulta);
    } catch (erro) {
      console.error(
        "Erro ao consultar consulta do tutor:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao consultar consulta."
      });
    }
  }
);

// Rotas administrativas e clínicas existentes.

tutorRoutes.use(
  autorizarPerfis(
    "Administrador",
    "Secretario",
    "Veterinario"
  )
);

tutorRoutes.get(
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
      return listarTutores(req, res);
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

      const tutores =
        await listarTutoresDoVeterinario(usuario.id);

      return res.json(tutores);
    } catch (erro) {
      console.error(
        "Erro ao listar tutores do veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar tutores."
      });
    }
  }
);

tutorRoutes.post(
  "/",
  autorizarPerfis("Administrador", "Secretario"),
  cadastrarTutor
);

tutorRoutes.get(
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

    const tutorId = Number(req.params.id);

    if (
      !Number.isSafeInteger(tutorId) ||
      tutorId <= 0
    ) {
      return res.status(400).json({
        mensagem: "ID do tutor inválido."
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
        await verificarAcessoTutorVeterinario(
          tutorId,
          usuario.id
        );

      if (!acessoPermitido) {
        return res.status(404).json({
          mensagem: "Tutor não encontrado."
        });
      }

      return next();
    } catch (erro) {
      console.error(
        "Erro ao verificar acesso ao tutor:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao verificar permissões."
      });
    }
  },
  consultarTutor
);

tutorRoutes.put(
  "/:id",
  autorizarPerfis("Administrador", "Secretario"),
  editarTutor
);

tutorRoutes.delete(
  "/:id",
  autorizarPerfis("Administrador"),
  removerTutor
);

export default tutorRoutes;