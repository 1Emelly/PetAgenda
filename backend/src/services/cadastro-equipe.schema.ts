import { z } from "zod";

export const cadastroEquipeSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres."),

  email: z.email("Informe um e-mail válido.")
    .trim()
    .toLowerCase(),

  perfil: z.enum([
    "Administrador",
    "Secretario",
    "Veterinario"
  ]),

  conta_teste: z.boolean().optional().default(false)
});