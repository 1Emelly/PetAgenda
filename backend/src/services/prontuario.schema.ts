import { z } from "zod";

export const prontuarioSchema = z.object({
  animalId: z.number()
    .int("O ID do animal deve ser um número inteiro.")
    .positive("Informe um animal válido."),

  atendimentoId: z.number()
    .int("O ID do atendimento deve ser um número inteiro.")
    .positive("Informe um atendimento válido."),

  descricao: z.string()
    .trim()
    .min(3, "A descrição deve ter pelo menos 3 caracteres.")
});

export const atualizarProntuarioSchema =
  prontuarioSchema.pick({
    descricao: true
  });