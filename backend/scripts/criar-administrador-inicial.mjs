import bcrypt from "bcryptjs";
import pg from "pg";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import "dotenv/config";

const { Pool } = pg;

const provisionamentoVercel = process.argv.includes("--vercel");

if (provisionamentoVercel && process.env.VERCEL_ENV !== "production") {
  throw new Error("O provisionamento da Vercel exige o ambiente Production.");
}

const databaseUrl = provisionamentoVercel ? process.env.DATABASE_URL?.trim() : null;
if (provisionamentoVercel && !databaseUrl) {
  throw new Error("DATABASE_URL de Production não foi disponibilizada.");
}

const conexao = databaseUrl ? new URL(databaseUrl) : null;
if (conexao) {
  conexao.searchParams.set("sslmode", "verify-full");
}

const pool = new Pool(conexao ? {
  connectionString: conexao.toString(),
  ssl: { rejectUnauthorized: true }
} : {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const terminal = provisionamentoVercel ? null : readline.createInterface({
  input,
  output
});

async function criarAdministradorInicial() {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    await cliente.query(
      "SELECT pg_advisory_xact_lock(784215)"
    );

    const resultado = await cliente.query(
      `SELECT COUNT(*)::int AS total
       FROM usuarios
       WHERE perfil = 'Administrador'`
    );

    if (resultado.rows[0].total > 0) {
      console.log(
        "Já existe uma conta administrativa cadastrada."
      );

      await cliente.query("ROLLBACK");
      return;
    }

    console.log("\nConfiguração inicial do PetAgenda\n");

    const nome = (
      provisionamentoVercel
        ? process.env.PETAGENDA_ADMIN_NOME ?? ""
        : await terminal.question("Nome do administrador: ")
    ).trim();

    const email = (
      provisionamentoVercel
        ? process.env.PETAGENDA_ADMIN_EMAIL ?? ""
        : await terminal.question("E-mail: ")
    ).trim().toLowerCase();

    const senha = provisionamentoVercel
      ? process.env.PETAGENDA_ADMIN_SENHA ?? ""
      : await terminal.question("Senha (mínimo de 12 caracteres): ");

    if (nome.length < 3) {
      throw new Error(
        "O nome precisa ter pelo menos 3 caracteres."
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    if (senha.length < 12) {
      throw new Error(
        "A senha precisa ter pelo menos 12 caracteres."
      );
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    await cliente.query(
      `INSERT INTO usuarios
         (
           nome,
           email,
           senha_hash,
           perfil,
           ativo,
           administrador_principal
         )
       VALUES ($1, $2, $3, 'Administrador', TRUE, TRUE)`,
      [nome, email, senhaHash]
    );

    await cliente.query("COMMIT");

    console.log(
      "\nAdministrador inicial cadastrado com sucesso."
    );
  } catch (erro) {
    await cliente.query("ROLLBACK");

    console.error(
      "Não foi possível criar o administrador:",
      erro instanceof Error ? erro.message : erro
    );

    process.exitCode = 1;
  } finally {
    cliente.release();
  }
}

try {
  await criarAdministradorInicial();
} catch (erro) {
  console.error(
    "Erro de conexão:",
    erro instanceof Error ? erro.message : erro
  );

  process.exitCode = 1;
} finally {
  terminal?.close();
  await pool.end();
}
