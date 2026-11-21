import { Router } from "express";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  autorizarPerfis
} from "../middlewares/autorizacao.middleware.js";

import {
  vincularTutor,
  consultarVinculacaoTutor,
  desvincularTutor
} from "../controllers/vinculacao-tutor.controller.js";

const vinculacaoTutorRoutes = Router();

vinculacaoTutorRoutes.use(autenticarToken);

vinculacaoTutorRoutes.use(
  autorizarPerfis(
    "Administrador",
    "Secretario"
  )
);

vinculacaoTutorRoutes.get(
  "/:tutorId",
  consultarVinculacaoTutor
);

vinculacaoTutorRoutes.put(
  "/:tutorId",
  vincularTutor
);

vinculacaoTutorRoutes.delete(
  "/:tutorId",
  desvincularTutor
);

export default vinculacaoTutorRoutes;