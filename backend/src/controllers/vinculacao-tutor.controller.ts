import {
  Request,
  Response
} from "express";

import {
  vincularUsuarioAoTutor,
  consultarVinculoTutor,
  removerVinculoTutor
} from "../services/vinculacao-tutor.service.js";

function validarId(valor: unknown): number | null {
  const id = Number(valor);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function obterCodigoErro(
  erro: unknown
): string | undefined {
  if (
    typeof erro === "object" &&
    erro !== null &&
    "code" in erro
  ) {
    return String(erro.code);
  }

  return undefined;
}

export async function vincularTutor(
  req: Request,
  res: Response
) {
  const tutorId = validarId(req.params.tutorId);
  const usuarioId = validarId(req.body?.usuarioId);

  if (!tutorId || !usuarioId) {
    return res.status(400).json({
      mensagem: "IDs do tutor ou usuário inválidos."
    });
  }

  try {
    const resultado = await vincularUsuarioAoTutor(
      tutorId,
      usuarioId
    );

    switch (resultado.tipo) {
      case "sucesso":
        return res.status(200).json({
          mensagem: "Usuário vinculado ao tutor com sucesso!",
          vinculo: resultado.vinculo
        });

      case "tutor_nao_encontrado":
        return res.status(404).json({
          mensagem: "Tutor não encontrado."
        });

      case "usuario_nao_encontrado":
        return res.status(404).json({
          mensagem: "Usuário não encontrado."
        });

      case "usuario_invalido":
        return res.status(403).json({
          mensagem:
            "O usuário precisa estar ativo e possuir perfil Tutor."
        });

      case "tutor_ja_vinculado":
        return res.status(409).json({
          mensagem:
            "Este tutor já possui uma conta vinculada."
        });

      case "usuario_ja_vinculado":
        return res.status(409).json({
          mensagem:
            "Este usuário já está vinculado a outro tutor."
        });
    }
  } catch (erro) {
    if (obterCodigoErro(erro) === "23505") {
      return res.status(409).json({
        mensagem: "Já existe um vínculo para este usuário."
      });
    }

    console.error(
      "Erro ao vincular usuário ao tutor:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao vincular tutor."
    });
  }
}

export async function consultarVinculacaoTutor(
  req: Request,
  res: Response
) {
  const tutorId = validarId(req.params.tutorId);

  if (!tutorId) {
    return res.status(400).json({
      mensagem: "ID do tutor inválido."
    });
  }

  try {
    const vinculo = await consultarVinculoTutor(
      tutorId
    );

    if (!vinculo) {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    return res.json(vinculo);
  } catch (erro) {
    console.error(
      "Erro ao consultar vínculo:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao consultar vínculo."
    });
  }
}

export async function desvincularTutor(
  req: Request,
  res: Response
) {
  const tutorId = validarId(req.params.tutorId);

  if (!tutorId) {
    return res.status(400).json({
      mensagem: "ID do tutor inválido."
    });
  }

  try {
    const resultado = await removerVinculoTutor(
      tutorId
    );

    if (resultado === "tutor_nao_encontrado") {
      return res.status(404).json({
        mensagem: "Tutor não encontrado."
      });
    }

    if (resultado === "sem_vinculo") {
      return res.status(409).json({
        mensagem: "Este tutor não possui vínculo ativo."
      });
    }

    return res.json({
      mensagem: "Vínculo removido com sucesso!"
    });
  } catch (erro) {
    console.error(
      "Erro ao remover vínculo:",
      erro
    );

    return res.status(500).json({
      mensagem: "Erro interno ao remover vínculo."
    });
  }
}