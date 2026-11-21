import bcrypt from "bcryptjs";
import pg from "pg";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const terminal = readline.createInterface({
  input,
  output
});

async function executarRecuperacao() {
  try {
    console.log("\n=== Recuperação administrativa do PetAgenda ===\n");

    const identificador = await terminal.question(
      "Informe o ID da conta administrativa: "
    );

    const usuarioId = Number(identificador);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      console.log("ID inválido.");
      return;
    }

    const resultado = await pool.query(
      `SELECT id, nome, email, perfil
       FROM usuarios
       WHERE id = $1
         AND perfil = 'Administrador'`,
      [usuarioId]
    );

    const usuario = resultado.rows[0];

    if (!usuario) {
      console.log("Conta administrativa não encontrada.");
      return;
    }

    console.log(`\nConta encontrada: ${usuario.nome}`);
    console.log(`E-mail: ${usuario.email}\n`);

    const confirmacao = await terminal.question(
      "Confirma a recuperação desta conta? (SIM): "
    );

    if (confirmacao !== "SIM") {
      console.log("Operação cancelada.");
      return;
    }

    const novaSenha = await terminal.question(
      "Digite a nova senha (mínimo de 12 caracteres): "
    );

    if (novaSenha.length < 12) {
      console.log("A senha precisa ter pelo menos 12 caracteres.");
      return;
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12);

    await pool.query(
      `UPDATE usuarios
       SET senha_hash = $1,
           ativo = TRUE
       WHERE id = $2
         AND perfil = 'Administrador'`,
      [senhaHash, usuarioId]
    );

    console.log("\nSenha administrativa redefinida com sucesso.");
    console.log("A conta existente foi preservada.");
  } catch (erro) {
    console.error("Erro na recuperação:", erro.message);
  } finally {
    terminal.close();
    await pool.end();
  }
}

await executarRecuperacao();