import { Request, Response } from "express";

import {
  consultaSchema,
  statusConsultaSchema
} from "../services/consulta.schema.js";

import {
  listarTodasConsultas,
  cadastrarNovaConsulta,
  buscarConsultaPorId,
  atualizarDataConsulta,
  atualizarStatusConsulta,
  verificarConflitoHorario
} from "../services/consulta.service.js";

import { buscarAnimalPorId } from "../services/animal.service.js";
import { buscarVeterinarioPorId } from "../services/veterinario.service.js";

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

function validarId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

export async function listarConsultas(
  _req: Request,
  res: Response
) {
  try {
    const consultas = await listarTodasConsultas();

    return res.json(consultas);
  } catch (erro) {
    console.error("Erro ao listar consultas:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao listar consultas."
    });
  }
}

export async function cadastrarConsulta(
  req: Request,
  res: Response
) {
  const validacao = consultaSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Dados da consulta inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const animal = await buscarAnimalPorId(
      validacao.data.animalId
    );

    if (!animal) {
      return res.status(404).json({
        mensagem: "Animal não encontrado."
      });
    }

    const veterinario = await buscarVeterinarioPorId(
      validacao.data.veterinarioId
    );

    if (!veterinario) {
      return res.status(404).json({
        mensagem: "Veterinário não encontrado."
      });
    }

    const conflito = await verificarConflitoHorario(
      validacao.data.veterinarioId,
      validacao.data.dataHora
    );

    if (conflito) {
      return res.status(409).json({
        mensagem: "Este veterinário já possui uma consulta nesse horário."
      });
    }

    const novaConsulta = await cadastrarNovaConsulta(
      validacao.data
    );

    if (!novaConsulta) {
      return res.status(409).json({
        mensagem: "Este veterinário já possui uma consulta nesse horário."
      });
    }

    return res.status(201).json({
      mensagem: "Consulta agendada com sucesso!",
      consulta: novaConsulta
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "23503") {
      return res.status(404).json({
        mensagem: "Animal ou veterinário não encontrado."
      });
    }

    console.error("Erro ao cadastrar consulta:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao cadastrar consulta."
    });
  }
}

export async function consultarConsulta(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID da consulta inválido."
    });
  }

  try {
    const consulta = await buscarConsultaPorId(id);

    if (!consulta) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    return res.json(consulta);
  } catch (erro) {
    console.error("Erro ao consultar consulta:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao consultar consulta."
    });
  }
}

export async function reagendarConsulta(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID da consulta inválido."
    });
  }

  const validacao = consultaSchema.pick({
    dataHora: true
  }).safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Data e horário inválidos.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const consultaExistente = await buscarConsultaPorId(id);

    if (!consultaExistente) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    if (
      consultaExistente.status === "Concluída" ||
      consultaExistente.status === "Cancelada"
    ) {
      return res.status(400).json({
        mensagem: "Não é possível reagendar uma consulta concluída ou cancelada."
      });
    }

    const conflito = await verificarConflitoHorario(
      consultaExistente.veterinarioId,
      validacao.data.dataHora,
      id
    );

    if (conflito) {
      return res.status(409).json({
        mensagem: "Este veterinário já possui uma consulta nesse horário."
      });
    }

    const consulta = await atualizarDataConsulta(
      id,
      validacao.data.dataHora
    );

    if (consulta === undefined) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    if (consulta === null) {
      return res.status(400).json({
        mensagem: "Não é possível reagendar uma consulta concluída ou cancelada."
      });
    }

    return res.json({
      mensagem: "Consulta reagendada com sucesso!",
      consulta
    });
  } catch (erro) {
    if (obterCodigoErro(erro) === "CONFLITO_HORARIO") {
      return res.status(409).json({
        mensagem: "Este veterinário já possui uma consulta nesse horário."
      });
    }

    console.error("Erro ao reagendar consulta:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao reagendar consulta."
    });
  }
}

export async function alterarStatusConsulta(
  req: Request,
  res: Response
) {
  const id = Number(req.params.id);

  if (!validarId(id)) {
    return res.status(400).json({
      mensagem: "ID da consulta inválido."
    });
  }

  const validacao = statusConsultaSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      mensagem: "Status da consulta inválido.",
      erros: validacao.error.issues.map((erro) => ({
        campo: erro.path.join("."),
        mensagem: erro.message
      }))
    });
  }

  try {
    const consulta = await atualizarStatusConsulta(
      id,
      validacao.data.status
    );

    if (consulta === undefined) {
      return res.status(404).json({
        mensagem: "Consulta não encontrada."
      });
    }

    if (consulta === null) {
      return res.status(400).json({
        mensagem: "Essa mudança de status não é permitida."
      });
    }

    return res.json({
      mensagem: "Status da consulta atualizado com sucesso!",
      consulta
    });
  } catch (erro) {
    console.error("Erro ao atualizar status da consulta:", erro);

    return res.status(500).json({
      mensagem: "Erro interno ao atualizar status da consulta."
    });
  }
}