import { Router } from "express";

import {
  listarVeterinarios,
  cadastrarVeterinario,
  consultarVeterinario,
  editarVeterinario,
  removerVeterinario
} from "../controllers/veterinario.controller.js";

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
  listarTodosVeterinarios,
  buscarVeterinarioPorId
} from "../services/veterinario.service.js";

const veterinarioRoutes = Router();

veterinarioRoutes.use(autenticarToken);

veterinarioRoutes.use(
  autorizarPerfis(
    "Administrador",
    "Secretario",
    "Veterinario"
  )
);

veterinarioRoutes.get(
  "/",
  async (req: RequisicaoAutenticada, res) => {
    if (req.usuario?.perfil !== "Veterinario") {
      return listarVeterinarios(req, res);
    }

    try {
      const veterinarios =
        await listarTodosVeterinarios();

      return res.json(
        veterinarios.map((veterinario) => ({
          id: veterinario.id,
          nome: veterinario.nome,
          crmv: veterinario.crmv
        }))
      );
    } catch (erro) {
      console.error(
        "Erro ao listar veterinários:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao listar veterinários."
      });
    }
  }
);

veterinarioRoutes.post(
  "/",
  autorizarPerfis("Administrador"),
  cadastrarVeterinario
);

veterinarioRoutes.get(
  "/:id",
  async (req: RequisicaoAutenticada, res) => {
    if (req.usuario?.perfil !== "Veterinario") {
      return consultarVeterinario(req, res);
    }

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        mensagem: "ID do veterinário inválido."
      });
    }

    try {
      const veterinario =
        await buscarVeterinarioPorId(id);

      if (!veterinario) {
        return res.status(404).json({
          mensagem: "Veterinário não encontrado."
        });
      }

      return res.json({
        id: veterinario.id,
        nome: veterinario.nome,
        crmv: veterinario.crmv
      });
    } catch (erro) {
      console.error(
        "Erro ao consultar veterinário:",
        erro
      );

      return res.status(500).json({
        mensagem: "Erro interno ao consultar veterinário."
      });
    }
  }
);

veterinarioRoutes.put(
  "/:id",
  autorizarPerfis("Administrador"),
  editarVeterinario
);

veterinarioRoutes.delete(
  "/:id",
  autorizarPerfis("Administrador"),
  removerVeterinario
);

export default veterinarioRoutes;