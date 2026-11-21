/*
 * PetAgenda
 *
 * Desenvolvimento: Alejandro Monteiro
 */

import express from "express";
import cors from "cors";

import animalRoutes from "./routes/animal.routes.js";
import tutorRoutes from "./routes/tutor.routes.js";
import veterinarioRoutes from "./routes/veterinario.routes.js";
import consultaRoutes from "./routes/consulta.routes.js";
import usuarioRoutes from "./routes/usuario.routes.js";
import atendimentoRoutes from "./routes/atendimento.routes.js";
import prontuarioRoutes from "./routes/prontuario.routes.js";
import vinculacaoTutorRoutes from "./routes/vinculacao-tutor.routes.js";
import recuperacaoSenhaRoutes from "./routes/recuperacao-senha.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    sistema: "PetAgenda",
    mensagem: "API funcionando!",
    status: "online"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    mensagem: "O servidor do PetAgenda está funcionando."
  });
});

app.use("/api/animais", animalRoutes);
app.use("/api/tutores", tutorRoutes);
app.use("/api/veterinarios", veterinarioRoutes);
app.use("/api/consultas", consultaRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/atendimentos", atendimentoRoutes);
app.use("/api/prontuarios", prontuarioRoutes);
app.use("/api/vinculacoes-tutores", vinculacaoTutorRoutes);
app.use("/api/recuperacao-senha", recuperacaoSenhaRoutes);

export default app;