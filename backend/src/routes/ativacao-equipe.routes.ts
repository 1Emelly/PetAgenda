import { Router } from "express";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  exigirAdministradorPrincipal
} from "../middlewares/administrador-principal.middleware.js";

import {
  gerarCodigoAtivacao,
  ativarContaEquipe
} from "../controllers/ativacao-equipe.controller.js";

const ativacaoEquipeRoutes = Router();

ativacaoEquipeRoutes.post(
  "/gerar",
  autenticarToken,
  exigirAdministradorPrincipal,
  gerarCodigoAtivacao
);

ativacaoEquipeRoutes.post(
  "/concluir",
  ativarContaEquipe
);

export default ativacaoEquipeRoutes;