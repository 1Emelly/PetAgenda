import { z } from "zod";

export const veterinarioSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório."),

  crmv: z.string().trim().min(1, "O CRMV é obrigatório."),

  telefone: z.string()
    .trim()
    .min(8, "Informe um telefone válido."),

  email: z.string()
    .trim()
    .email("Informe um e-mail válido.")
});