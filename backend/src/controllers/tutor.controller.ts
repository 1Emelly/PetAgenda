import { Request, Response } from "express";
import { tutorSchema } from "../services/tutor.schema.js";

import {
  listarTodosTutores,
  cadastrarNovoTutor,
  buscarTutorPorId,
  atualizarTutor,
  excluirTutor
} from "../services/tutor.service.js";

export async function listarTutores(_req: Request, res: Response) {
  try {
    const tutores = await listarTodosTutores();

    return res.json(tutores);
  } catch (erro) {
    console.error("Erro ao listar tutores:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar tutores."
    });
  }
}

export async function cadastrarTutor(req: Request, res: Response) {
  const validacao = tutorSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do tutor inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const novoTutor = await cadastrarNovoTutor(validacao.data);

    return res.status(201).json({
      mensagem: "Tutor cadastrado com sucesso!",
      tutor: novoTutor
    });
  } catch (erro: unknown) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23505"
    ) {
      return res.status(409).json({
        mensagem: "Já existe um tutor cadastrado com este e-mail."
      });
    }

    console.error("Erro ao cadastrar tutor:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar tutor."
    });
  }
}

export async function consultarTutor(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do tutor inválido."
    });
  }

  try {
    const tutor = await buscarTutorPorId(id);

    if (!tutor) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    return res.json(tutor);
  } catch (erro) {
    console.error("Erro ao consultar tutor:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar tutor."
    });
  }
}

export async function editarTutor(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do tutor inválido."
    });
  }

  const validacao = tutorSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do tutor inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const tutorAtualizado = await atualizarTutor(id, validacao.data);

    if (!tutorAtualizado) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    return res.json({
      mensagem: "Tutor atualizado com sucesso!",
      tutor: tutorAtualizado
    });
  } catch (erro) {
    console.error("Erro ao atualizar tutor:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar tutor."
    });
  }
}

export async function removerTutor(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do tutor inválido."
    });
  }

  try {
    const removido = await excluirTutor(id);

    if (!removido) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    return res.json({
      mensagem: "Tutor excluído com sucesso!"
    });
  } catch (erro: unknown) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23503"
    ) {
      return res.status(409).json({
        mensagem: "Não é possível excluir um tutor que possui registros vinculados."
      });
    }

    console.error("Erro ao excluir tutor:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao excluir tutor."
    });
  }
}