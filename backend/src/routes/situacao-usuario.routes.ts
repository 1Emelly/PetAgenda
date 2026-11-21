import { Router } from "express";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  autorizarPerfis
} from "../middlewares/autorizacao.middleware.js";

import {
  atualizarSituacaoUsuario
} from "../controllers/situacao-usuario.controller.js";

const situacaoUsuarioRoutes = Router();

situacaoUsuarioRoutes.patch(
  "/:id/situacao",
  autenticarToken,
  autorizarPerfis("Administrador"),
  atualizarSituacaoUsuario
);

export default situacaoUsuarioRoutes;