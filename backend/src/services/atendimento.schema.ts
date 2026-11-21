import { z } from "zod";

export const atendimentoSchema = z.object({
  consultaId: z.number()
    .int("O ID da consulta deve ser um número inteiro.")
    .positive("Informe uma consulta válida."),

  diagnostico: z.string()
    .trim()
    .min(3, "O diagnóstico deve ter pelo menos 3 caracteres."),

  procedimentos: z.string()
    .trim()
    .optional(),

  observacoes: z.string()
    .trim()
    .optional(),

  orientacoes: z.string()
    .trim()
    .optional()
});

export const atualizarAtendimentoSchema =
  atendimentoSchema.omit({
    consultaId: true
  }).partial().refine(
    (dados) => Object.keys(dados).length > 0,
    "Informe pelo menos um campo para atualizar."
  );