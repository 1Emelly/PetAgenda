import { Router } from "express";

import {
  cadastrarUsuario,
  realizarLogin
} from "../controllers/usuario.controller.js";

import {
  autenticarToken,
  RequisicaoAutenticada
} from "../middlewares/autenticacao.middleware.js";

import { autorizarPerfis } from "../middlewares/autorizacao.middleware.js";

import {
  buscarUsuarioPorId,
  listarTodosUsuarios
} from "../services/usuario.service.js";

import cadastroEquipeRoutes from "./cadastro-equipe.routes.js";

import ativacaoEquipeRoutes from "./ativacao-equipe.routes.js";

import situacaoUsuarioRoutes from "./situacao-usuario.routes.js";

// =====================================================
// ALTERACAO DE E-MAIL - MINHA CONTA
// =====================================================

import alteracaoEmailRoutes from "./alteracao-email.routes.js";

const usuarioRoutes = Router();

usuarioRoutes.post("/cadastro", cadastrarUsuario);

usuarioRoutes.post("/login", realizarLogin);

// Cadastro administrativo de funcionários e administradores.
usuarioRoutes.use("/equipe", cadastroEquipeRoutes);

// Ativação de contas de funcionários e administradores.
usuarioRoutes.use("/ativacao-equipe", ativacaoEquipeRoutes);

// Alteração de e-mail do usuário autenticado.
usuarioRoutes.use("/alteracao-email", alteracaoEmailRoutes);

usuarioRoutes.use("/", situacaoUsuarioRoutes);

usuarioRoutes.get(
  "/me",
  autenticarToken,
  async (req: RequisicaoAutenticada, res) => {
    try {
      const usuarioId = req.usuario?.id;

      if (!usuarioId) {
        return res.status(401).json({
          mensagem: "Usuário não autenticado."
        });
      }

      const usuario = await buscarUsuarioPorId(usuarioId);

      if (!usuario || !usuario.ativo) {
        return res.status(401).json({
          mensagem: "Usuário não encontrado ou inativo."
        });
      }

      return res.json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      });
    } catch (erro) {
      console.error("Erro ao consultar usuário autenticado:", erro);

      return res.status(500).json({
        mensagem: "Erro interno ao consultar usuário."
      });
    }
  }
);

usuarioRoutes.get(
  "/",
  autenticarToken,
  autorizarPerfis("Administrador"),
  async (_req, res) => {
    try {
      const usuarios = await listarTodosUsuarios();

      return res.json(usuarios);
    } catch (erro) {
      console.error("Erro ao listar usuários:", erro);

      return res.status(500).json({
        mensagem: "Erro interno ao listar usuários."
      });
    }
  }
);

export default usuarioRoutes;