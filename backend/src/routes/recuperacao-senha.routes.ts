import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  solicitarCodigoRecuperacao,
  confirmarNovaSenha
} from "../controllers/recuperacao-senha.controller.js";

const recuperacaoSenhaRoutes = Router();

const limitarSolicitacoes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    mensagem:
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
  }
});

const limitarRedefinicoes = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    mensagem:
      "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
  }
});

recuperacaoSenhaRoutes.post(
  "/solicitar",
  limitarSolicitacoes,
  solicitarCodigoRecuperacao
);

recuperacaoSenhaRoutes.post(
  "/redefinir",
  limitarRedefinicoes,
  confirmarNovaSenha
);

export default recuperacaoSenhaRoutes;