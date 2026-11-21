import { Request, Response } from "express";
import { animalSchema } from "../services/animal.schema.js";

import {
  listarTodosAnimais,
  cadastrarNovoAnimal,
  buscarAnimalPorId,
  atualizarAnimal,
  excluirAnimal
} from "../services/animal.service.js";

import { buscarTutorPorId } from "../services/tutor.service.js";

export async function listarAnimais(_req: Request, res: Response) {
  try {
    const animais = await listarTodosAnimais();

    return res.json(animais);
  } catch (erro) {
    console.error("Erro ao listar animais:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar animais."
    });
  }
}

export async function cadastrarAnimal(req: Request, res: Response) {
  const validacao = animalSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do animal inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const tutor = await buscarTutorPorId(validacao.data.tutorId);

    if (!tutor) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado. Cadastre o tutor antes de cadastrar o animal."
      });
    }

    const novoAnimal = await cadastrarNovoAnimal(validacao.data);

    return res.status(201).json({
      mensagem: "Animal cadastrado com sucesso!",
      animal: novoAnimal
    });
  } catch (erro) {
    console.error("Erro ao cadastrar animal:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar animal."
    });
  }
}

export async function consultarAnimal(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do animal inválido."
    });
  }

  try {
    const animal = await buscarAnimalPorId(id);

    if (!animal) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    return res.json(animal);
  } catch (erro) {
    console.error("Erro ao consultar animal:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar animal."
    });
  }
}

export async function editarAnimal(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do animal inválido."
    });
  }

  const validacao = animalSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do animal inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const tutor = await buscarTutorPorId(validacao.data.tutorId);

    if (!tutor) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    const animalAtualizado = await atualizarAnimal(id, validacao.data);

    if (!animalAtualizado) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    return res.json({
      mensagem: "Animal atualizado com sucesso!",
      animal: animalAtualizado
    });
  } catch (erro) {
    console.error("Erro ao atualizar animal:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar animal."
    });
  }
}

export async function removerAnimal(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do animal inválido."
    });
  }

  try {
    const removido = await excluirAnimal(id);

    if (!removido) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    return res.json({
      mensagem: "Animal excluído com sucesso!"
    });
  } catch (erro: unknown) {
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "23503"
    ) {
      return res.status(409).json({
        mensagem: "Não é possível excluir um animal que possui consultas ou prontuários vinculados."
      });
    }

    console.error("Erro ao excluir animal:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao excluir animal."
    });
  }
}