import {
  Router,
  Response
} from "express";

import {
  listarConsultas,
  cadastrarConsulta,
  consultarConsulta,
  reagendarConsulta,
  alterarStatusConsulta
} from "../controllers/consulta.controller.js";

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
  listarConsultasDoVeterinario
} from "../services/consultas-veterinario.service.js";

const consultaRoutes = Router();

consultaRoutes.use(autenticarToken);

consultaRoutes.use(
  autorizarPerfis(
    "Administrador",
    "Secretario",
    "Veterinario"
  )
);

consultaRoutes.get(
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
      return listarConsultas(req, res);
    }

    try {
      const consultas =
        await listarConsultasDoVeterinario(
          usuario.id
        );

      return res.json(consultas);

    } catch (erro) {
      console.error(
        "Erro ao listar consultas do veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem:
          "Erro interno ao listar consultas."
      });
    }
  }
);

consultaRoutes.post(
  "/",
  autorizarPerfis(
    "Administrador",
    "Secretario"
  ),
  cadastrarConsulta
);

consultaRoutes.get(
  "/:id",
  verificarAcessoClinico("consulta"),
  consultarConsulta
);

consultaRoutes.put(
  "/:id/reagendar",
  autorizarPerfis(
    "Administrador",
    "Secretario"
  ),
  reagendarConsulta
);

consultaRoutes.patch(
  "/:id/status",
  verificarAcessoClinico("consulta"),
  alterarStatusConsulta
);

export default consultaRoutes;