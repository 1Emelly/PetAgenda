import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  solicitarMudancaEmail,
  confirmarMudancaEmail
} from "../controllers/alteracao-email.controller.js";

const alteracaoEmailRoutes = Router();

const limiteSolicitacoes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    mensagem:
      "Muitas solicitações de alteração de e-mail. " +
      "Tente novamente em 15 minutos."
  }
});

const limiteConfirmacoes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    mensagem:
      "Muitas tentativas de confirmação. " +
      "Tente novamente em 15 minutos."
  }
});

alteracaoEmailRoutes.post(
  "/solicitar",
  autenticarToken,
  limiteSolicitacoes,
  solicitarMudancaEmail
);

alteracaoEmailRoutes.post(
  "/confirmar",
  autenticarToken,
  limiteConfirmacoes,
  confirmarMudancaEmail
);

export default alteracaoEmailRoutes;