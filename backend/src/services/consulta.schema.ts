import { z } from "zod";

export const consultaSchema = z.object({
  animalId: z.number()
    .int("O ID do animal deve ser um número inteiro.")
    .positive("Informe um animal válido."),

  veterinarioId: z.number()
    .int("O ID do veterinário deve ser um número inteiro.")
    .positive("Informe um veterinário válido."),

  dataHora: z.string()
    .datetime({
      offset: true
    })
    .refine(
      (valor) => !Number.isNaN(Date.parse(valor)),
      "Informe uma data e horário válidos."
    ),

  motivo: z.string()
    .trim()
    .min(3, "O motivo deve ter pelo menos 3 caracteres.")
});

export const statusConsultaSchema = z.object({
  status: z.enum([
    "Agendada",
    "Confirmada",
    "Em atendimento",
    "Concluída",
    "Cancelada"
  ])
});

export type StatusConsulta =
  z.infer<typeof statusConsultaSchema>["status"];