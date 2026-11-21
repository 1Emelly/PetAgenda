import { z } from "zod";

export const usuarioSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres."),

  email: z.string()
    .trim()
    .email("Informe um e-mail válido."),

  senha: z.string()
    .min(8, "A senha deve ter pelo menos 8 caracteres."),

  perfil: z.enum([
    "Administrador",
    "Secretario",
    "Veterinario",
    "Tutor"
  ])
});

export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Informe um e-mail válido."),

  senha: z.string()
    .min(1, "A senha é obrigatória.")
});