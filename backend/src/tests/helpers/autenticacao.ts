import jwt from "jsonwebtoken";
import { pool } from "../../config/database.js";

export type PerfilTeste =
  | "Administrador"
  | "Secretario"
  | "Veterinario"
  | "Tutor";

export async function criarTokenTeste(
  perfil: PerfilTeste = "Administrador"
): Promise<string> {
  const identificador =
    `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

  const resultado = await pool.query<{ id: number }>(
    `INSERT INTO usuarios (
      nome,
      email,
      senha_hash,
      perfil
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [
      `Usuário de Teste ${perfil}`,
      `teste.${perfil}.${identificador}@petagenda.com`,
      "hash-exclusivo-para-testes",
      perfil
    ]
  );

  const chave = process.env.JWT_SECRET;

  if (!chave) {
    throw new Error("JWT_SECRET não configurado.");
  }

  return jwt.sign(
    {
      id: resultado.rows[0].id,
      perfil
    },
    chave,
    {
      algorithm: "HS256",
      expiresIn: "1h"
    }
  );
}