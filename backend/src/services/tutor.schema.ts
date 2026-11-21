import { z } from "zod";

export const tutorSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório."),
  telefone: z.string().trim().min(8, "Informe um telefone válido."),
  email: z.string().trim().email("Informe um e-mail válido.")
});