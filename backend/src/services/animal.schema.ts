import { z } from "zod";

export const animalSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório."),
  especie: z.string().trim().min(1, "A espécie é obrigatória."),
  raca: z.string().trim().min(1, "A raça é obrigatória."),
  idade: z.number()
    .int("A idade deve ser um número inteiro.")
    .min(0, "A idade não pode ser negativa."),
  tutorId: z.number()
    .int("O ID do tutor deve ser um número inteiro.")
    .positive("Informe um ID de tutor válido.")
});