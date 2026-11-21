import { Request, Response } from "express";
import { veterinarioSchema } from "../services/veterinario.schema.js";

import {
  listarTodosVeterinarios,
  cadastrarNovoVeterinario,
  buscarVeterinarioPorId,
  atualizarVeterinario,
  excluirVeterinario
} from "../services/veterinario.service.js";

function obterCodigoErro(erro: unknown): string | undefined {
  if (typeof erro === "object" && erro !== null && "code" in erro) {
    return String(erro.code);
  }

  return undefined;
}

export async function listarVeterinarios(
  _req: Request,
  res: Response
) {
  try {
    const veterinarios = await listarTodosVeterinarios();

    return res.json(veterinarios);
  } catch (erro) {
    console.error("Erro ao listar veterinários:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar veterinários."
    });
  }
}

export async function cadastrarVeterinario(
  req: Request,
  res: Response
) {
  const validacao = veterinarioSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do veterinário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const novoVeterinario = await cadastrarNovoVeterinario(
      validacao.data
    );

    return res.status(201).json({
      mensagem: "Veterinário cadastrado com sucesso!",
      veterinario: novoVeterinario
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "23505") {
      return res.status(409).json({
        mensagem: "Já existe um veterinário cadastrado com este CRMV."
      });
    }

    console.error("Erro ao cadastrar veterinário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar veterinário."
    });
  }
}

export async function consultarVeterinario(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do veterinário inválido."
    });
  }

  try {
    const veterinario = await buscarVeterinarioPorId(id);

    if (!veterinario) {
      return res.status(404).json({
        mensagem: "Veterinário não encontrado."
      });
    }

    return res.json(veterinario);
  } catch (erro) {
    console.error("Erro ao consultar veterinário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar veterinário."
    });
  }
}

export async function editarVeterinario(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do veterinário inválido."
    });
  }

  const validacao = veterinarioSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do veterinário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const veterinarioAtualizado = await atualizarVeterinario(
      id,
      validacao.data
    );

    if (!veterinarioAtualizado) {
      return res.status(404).json({
        mensagem: "Veterinário não encontrado."
      });
    }

    return res.json({
      mensagem: "Veterinário atualizado com sucesso!",
      veterinario: veterinarioAtualizado
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "23505") {
      return res.status(409).json({
        mensagem: "Já existe um veterinário cadastrado com este CRMV."
      });
    }

    console.error("Erro ao atualizar veterinário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar veterinário."
    });
  }
}

export async function removerVeterinario(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      mensagem: "ID do veterinário inválido."
    });
  }

  try {
    const removido = await excluirVeterinario(id);

    if (!removido) {
      return res.status(404).json({
        mensagem: "Veterinário não encontrado."
      });
    }

    return res.json({
      mensagem: "Veterinário excluído com sucesso!"
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "23503") {
      return res.status(409).json({
        mensagem: "Não é possível excluir um veterinário que possui consultas vinculadas."
      });
    }

    console.error("Erro ao excluir veterinário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao excluir veterinário."
    });
  }
}