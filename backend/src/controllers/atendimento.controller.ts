import { Request, Response } from "express";

import {
  atendimentoSchema,
  atualizarAtendimentoSchema
} from "../services/atendimento.schema.js";

import {
  listarTodosAtendimentos,
  buscarAtendimentoPorId,
  buscarAtendimentoPorConsulta,
  cadastrarNovoAtendimento,
  atualizarDadosAtendimento
} from "../services/atendimento.service.js";

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

export async function listarAtendimentos(
  _req: Request,
  res: Response
) {
  try {
    const atendimentos = await listarTodosAtendimentos();

    return res.json(atendimentos);
  } catch (erro) {
    console.error("Erro ao listar atendimentos:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar atendimentos."
    });
  }
}

export async function consultarAtendimento(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID do atendimento inválido."
    });
  }

  try {
    const atendimento = await buscarAtendimentoPorId(id);

    if (!atendimento) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado."
      });
    }

    return res.json(atendimento);
  } catch (erro) {
    console.error("Erro ao consultar atendimento:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar atendimento."
    });
  }
}

export async function consultarAtendimentoPorConsulta(
  req: Request,
  res: Response
) {
  const consultaId = Number(req.params.consultaId);

  if (!validarId(consultaId)) {
    return res.status(400).json({
      mensagem: "ID da consulta inválido."
    });
  }

  try {
    const atendimento = await buscarAtendimentoPorConsulta(
      consultaId
    );

    if (!atendimento) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado para esta consulta."
      });
    }

    return res.json(atendimento);
  } catch (erro) {
    console.error(
      "Erro ao consultar atendimento por consulta:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao consultar atendimento."
    });
  }
}

export async function cadastrarAtendimento(
  req: Request,
  res: Response
) {
  const validacao = atendimentoSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do atendimento inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const consulta = await buscarConsultaPorId(
      validacao.data.consultaId
    );

    if (!consulta) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    if (
      consulta.status !== "Em atendimento" &&
      consulta.status !== "Concluída"
    ) {
      return res.status(400).json({
        mensagem:
          "O atendimento só pode ser registrado em consultas em atendimento ou concluídas."
      });
    }

    const atendimentoExistente =
      await buscarAtendimentoPorConsulta(
        validacao.data.consultaId
      );

    if (atendimentoExistente) {
      return res.status(409).json({
        mensagem: "Esta consulta já possui um atendimento registrado."
      });
    }

    const atendimento = await cadastrarNovoAtendimento(
      validacao.data
    );

    return res.status(201).json({
      mensagem: "Atendimento cadastrado com sucesso!",
      atendimento
    });
  } catch (erro) {
    const codigo = obterCodigoErro(erro);

    if (codigo === "23505") {
      return res.status(409).json({
        mensagem: "Esta consulta já possui um atendimento registrado."
      });
    }

    if (codigo === "23503") {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    console.error("Erro ao cadastrar atendimento:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar atendimento."
    });
  }
}

export async function atualizarAtendimento(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID do atendimento inválido."
    });
  }

  const validacao = atualizarAtendimentoSchema.safeParse(
    req.body
  );

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados do atendimento inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const atendimento = await atualizarDadosAtendimento(
      id,
      validacao.data
    );

    if (!atendimento) {
      return res.status(404).json({
        mensagem: "Atendimento não encontrado."
      });
    }

    return res.json({
      mensagem: "Atendimento atualizado com sucesso!",
      atendimento
    });
  } catch (erro) {
    console.error("Erro ao atualizar atendimento:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar atendimento."
    });
  }
}