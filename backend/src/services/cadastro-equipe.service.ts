import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import { pool } from "../config/database.js";

interface DadosCadastroEquipe {
  nome: string;
  email: string;
  perfil: "Administrador" | "Secretario" | "Veterinario";
  conta_teste?: boolean;
}

interface ContaEquipe {
  id: number;
  nome: string;
  email: string;
  perfil: DadosCadastroEquipe["perfil"];
  ativo: boolean;
  administrador_principal: boolean;
  conta_teste: boolean;
}

export async function cadastrarContaEquipe(
  dados: DadosCadastroEquipe
): Promise<ContaEquipe> {
  const senhaAleatoria = randomBytes(48).toString("hex");

  const senhaHash = await bcrypt.hash(senhaAleatoria, 12);

  const resultado = await pool.query<ContaEquipe>(
    `INSERT INTO usuarios (
      nome,
      email,
      senha_hash,
      perfil,
      ativo,
      administrador_principal,
      conta_teste
    )
    VALUES ($1, $2, $3, $4, FALSE, FALSE, $5)
    RETURNING
      id,
      nome,
      email,
      perfil,
      ativo,
      administrador_principal,
      conta_teste`,
    [
      dados.nome.trim(),
      dados.email.trim().toLowerCase(),
      senhaHash,
      dados.perfil,
      dados.conta_teste === true
    ]
  );

  return resultado.rows[0];
}