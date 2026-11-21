import { Router } from "express";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  autorizarPerfis
} from "../middlewares/autorizacao.middleware.js";

import {
  cadastrarUsuarioEquipe
} from "../controllers/cadastro-equipe.controller.js";

const cadastroEquipeRoutes = Router();

cadastroEquipeRoutes.post(
  "/",
  autenticarToken,
  autorizarPerfis("Administrador"),
  cadastrarUsuarioEquipe
);

export default cadastroEquipeRoutes;