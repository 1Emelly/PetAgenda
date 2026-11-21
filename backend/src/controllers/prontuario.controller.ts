import { Request, Response } from "express";

import {
  prontuarioSchema,
  atualizarProntuarioSchema
} from "../services/prontuario.schema.js";

import {
  listarTodosProntuarios,
  buscarProntuarioPorId,
  listarProntuariosPorAnimal,
  buscarProntuarioPorAtendimento,
  cadastrarNovoProntuario,
  atualizarDescricaoProntuario
} from "../services/prontuario.service.js";

import { buscarAnimalPorId } from "../services/animal.service.js";

import { buscarAtendimentoPorId } from "../services/atendimento.service.js";

import { buscarConsultaPorId } from "../services/consulta.service.js";

function validarId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function obterCodigoErro(erro: unknown): string | undefined {
  if (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro
  ) {
    return String(erro.code);
  }

  return undefined;
}

export async function listarProntuarios(
  _req: Request,
  res: Response
) {
  try {
    const prontuarios = await listarTodosProntuarios();

    return res.json(prontuarios);
  } catch (erro) {
    console.error("Erro ao listar prontuários:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar prontuários."
    });
  }
}

export async function consultarProntuario(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID do prontuário inválido."
    });
  }

  try {
    const prontuario = await buscarProntuarioPorId(id);

    if (!prontuario) {
      return res.status(404).json({
        mensagem: "Prontuário não encontrado."
      });
    }

    return res.json(prontuario);
  } catch (erro) {
    console.error("Erro ao consultar prontuário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar prontuário."
    });
  }
}

export async function consultarProntuariosPorAnimal(
  req: Request,
  res: Response
) {
  const animalId = Number(req.params.animalId);

  if (!validarId(animalId)) {
    return res.status(400).json({
      mensagem: "ID do animal inválido."
    });
  }

  try {
    const animal = await buscarAnimalPorId(animalId);

    if (!animal) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    const prontuarios = await listarProntuariosPorAnimal(
      animalId
    );

    return res.json(prontuarios);
  } catch (erro) {
    console.error(
      "Erro ao consultar prontuários do animal:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao consultar prontuários."
    });
  }
}

export async function consultarProntuarioPorAtendimento(
  req: Request,
  res: Response
) {
  const atendimentoId = Number(req.params.atendimentoId);

  if (!validarId(atendimentoId)) {
    return res.status(400).json({
      mensagem: "ID do atendimento inválido."
    });
  }

  try {
    const prontuario = await buscarProntuarioPorAtendimento(
      atendimentoId
    );

    if (!prontuario) {
      return res.status(404).json({
        mensagem: "Prontuário não encontrado para este atendimento."
      });
    }

    return res.json(prontuario);
  } catch (erro) {
    console.error(
      "Erro ao consultar prontuário por atendimento:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao consultar prontuário."
    });
  }
}

export async function cadastrarProntuario(
  req: Request,
  res: Response
) {
  const validacao = prontuarioSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do prontuário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const { animalId, atendimentoId } = validacao.data;

    const animal = await buscarAnimalPorId(animalId);

    if (!animal) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    const atendimento = await buscarAtendimentoPorId(
      atendimentoId
    );

    if (!atendimento) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado."
      });
    }

    const consulta = await buscarConsultaPorId(
      atendimento.consultaId
    );

    if (!consulta) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    if (consulta.animalId !== animalId) {
      return res.status(400).json({
        mensagem:
          "O atendimento informado não pertence ao animal selecionado."
      });
    }

    const prontuarioExistente =
      await buscarProntuarioPorAtendimento(atendimentoId);

    if (prontuarioExistente) {
      return res.status(409).json({
        mensagem:
          "Este atendimento já possui um prontuário registrado."
      });
    }

    const prontuario = await cadastrarNovoProntuario(
      validacao.data
    );

    return res.status(201).json({
      mensagem: "Prontuário cadastrado com sucesso!",
      prontuario
    });
  } catch (erro) {
    const codigo = obterCodigoErro(erro);

    if (codigo === "23505") {
      return res.status(409).json({
        mensagem:
          "Este atendimento já possui um prontuário registrado."
      });
    }

    if (codigo === "23503") {
      return res.status(404).json({
        mensagem: "Animal ou atendimento não encontrado."
      });
    }

    console.error("Erro ao cadastrar prontuário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar prontuário."
    });
  }
}

export async function atualizarProntuario(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID do prontuário inválido."
    });
  }

  const validacao = atualizarProntuarioSchema.safeParse(
    req.body
  );

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do prontuário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const prontuario = await atualizarDescricaoProntuario(
      id,
      validacao.data.descricao
    );

    if (!prontuario) {
      return res.status(404).json({
        mensagem: "Prontuário não encontrado."
      });
    }

    return res.json({
      mensagem: "Prontuário atualizado com sucesso!",
      prontuario
    });
  } catch (erro) {
    console.error("Erro ao atualizar prontuário:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar prontuário."
    });
  }
}